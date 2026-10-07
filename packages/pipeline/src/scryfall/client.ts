/**
 * The only module that knows Scryfall's HTTP API.
 *
 * Scryfall asks API clients to send a User-Agent and an Accept header and to
 * wait 50–100 ms between requests: https://scryfall.com/docs/api
 * Bulk files are served from a CDN and are not rate limited.
 *
 * `fetch` and `sleep` are injected (Dependency Inversion), so tests run the
 * real pagination logic against a fake server, instantly and offline.
 */
import { inflateIfGzip, type BulkFormat } from "./bulk-file.ts";
import type { ScryfallCard } from "./types.ts";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface ScryfallClientOptions {
  /** Identifies the project, e.g. "ReComTCG/0.1 (+https://github.com/owner/repo)". */
  userAgent: string;
  fetchFn?: FetchFn;
  sleep?: (ms: number) => Promise<void>;
  requestDelayMs?: number;
}

export interface BulkFileInfo {
  downloadUri: string;
  updatedAt: string;
  format: BulkFormat;
}

/** A bulk item as Scryfall documents it. Fields are optional here because we validate them. */
interface BulkItem {
  type: string;
  uri?: string;
  /** Original JSON-array file. Scryfall stopped listing it in 2026. */
  download_uri?: string;
  /** Gzip-compressed JSON Lines file, one card per line. */
  jsonl_download_uri?: string;
  updated_at?: string;
}

interface BulkList {
  data: BulkItem[];
}

interface SearchPage<T> {
  data: T[];
  has_more: boolean;
  next_page?: string;
}

/** "cards" = one result per card; "prints" = one per printing (each language edition counts). */
type Unique = "cards" | "prints";

export class ScryfallClient {
  static readonly API_URL = "https://api.scryfall.com";

  private readonly fetchFn: FetchFn;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly requestDelayMs: number;
  private readonly headers: Record<string, string>;

  constructor(options: ScryfallClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.requestDelayMs = options.requestDelayMs ?? 100;
    this.headers = { "User-Agent": options.userAgent, Accept: "application/json;q=0.9,*/*;q=0.8" };
  }

  /** The "oracle_cards" bulk file: one entry per card, not per printing (RN-10). */
  async oracleBulkFile(): Promise<BulkFileInfo> {
    const list = await this.getJson<BulkList>(`${ScryfallClient.API_URL}/bulk-data`);
    const listed = list.data.find((bulk) => bulk.type === "oracle_cards");
    if (!listed) throw new Error("Scryfall bulk-data has no oracle_cards entry");

    // The list normally carries the download link. If it does not, the
    // item's own endpoint (`uri`) is the documented place to read it from.
    const entry = hasDownloadLink(listed) || !listed.uri ? listed : await this.getJson<BulkItem>(listed.uri);
    const link = downloadLinkOf(entry);
    if (!link || !entry.updated_at) {
      throw new Error(
        `Scryfall's oracle_cards bulk item has no download link or updated_at. ` +
          `Fields received: ${Object.keys(entry).join(", ")}`
      );
    }
    return { ...link, updatedAt: entry.updated_at };
  }

  /** Downloads a bulk file, already decompressed if it came as gzip. */
  async download(url: string): Promise<Uint8Array> {
    const response = await this.request(url);
    return inflateIfGzip(new Uint8Array(await response.arrayBuffer()));
  }

  /** Every oracle_id returned by a search, following all result pages. */
  async searchOracleIds(query: string): Promise<string[]> {
    const cards = await this.searchAll<{ oracle_id?: string }>(query, "cards");
    return [...new Set(cards.flatMap((card) => (card.oracle_id ? [card.oracle_id] : [])))].sort();
  }

  /**
   * Every printing in one language, e.g. "es" (RN-11). Each printing is
   * fetched because a card's translation sometimes changed between sets,
   * and a player's list may use any of them.
   */
  async localizedPrintings(lang: string): Promise<ScryfallCard[]> {
    return this.searchAll<ScryfallCard>(`lang:${lang}`, "prints", { include_multilingual: "true" });
  }

  /**
   * Follows every result page of a search. Scryfall answers 404 when
   * nothing matches; that is an empty result, not an error.
   */
  private async searchAll<T>(query: string, unique: Unique, extra: Record<string, string> = {}): Promise<T[]> {
    const params = new URLSearchParams({ q: query, unique, ...extra });
    let url: string | undefined = `${ScryfallClient.API_URL}/cards/search?${params.toString().replace(/\+/g, "%20")}`;
    const results: T[] = [];
    while (url) {
      await this.sleep(this.requestDelayMs);
      const response = await this.fetchFn(url, { headers: this.headers });
      if (response.status === 404 && results.length === 0) return [];
      if (!response.ok) throw new Error(`GET ${url} → ${response.status} ${response.statusText}`);
      const page = (await response.json()) as SearchPage<T>;
      results.push(...page.data);
      url = page.has_more ? page.next_page : undefined;
    }
    return results;
  }

  private async getJson<T>(url: string): Promise<T> {
    return (await (await this.request(url)).json()) as T;
  }

  private async request(url: string): Promise<Response> {
    const response = await this.fetchFn(url, { headers: this.headers });
    if (!response.ok) throw new Error(`GET ${url} → ${response.status} ${response.statusText}`);
    return response;
  }
}

function hasDownloadLink(item: BulkItem): boolean {
  return downloadLinkOf(item) !== null;
}

/** JSON Lines first (the current format), then the original JSON array. */
function downloadLinkOf(item: BulkItem): { downloadUri: string; format: BulkFormat } | null {
  if (item.jsonl_download_uri) return { downloadUri: item.jsonl_download_uri, format: "jsonl" };
  if (item.download_uri) return { downloadUri: item.download_uri, format: "json" };
  return null;
}
