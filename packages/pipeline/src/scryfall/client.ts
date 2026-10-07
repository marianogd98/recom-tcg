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
}

/** A bulk item as Scryfall documents it. Fields are optional here because we validate them. */
interface BulkItem {
  type: string;
  uri?: string;
  download_uri?: string;
  updated_at?: string;
}

interface BulkList {
  data: BulkItem[];
}

interface SearchPage {
  data: { oracle_id?: string }[];
  has_more: boolean;
  next_page?: string;
}

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

    // The list should already carry download_uri. If it does not, the item's
    // own endpoint (`uri`) is the documented place to read it from.
    const entry = listed.download_uri || !listed.uri ? listed : await this.getJson<BulkItem>(listed.uri);
    if (!entry.download_uri || !entry.updated_at) {
      throw new Error(
        `Scryfall's oracle_cards bulk item has no download_uri/updated_at. ` +
          `Fields received: ${Object.keys(entry).join(", ")}`
      );
    }
    return { downloadUri: entry.download_uri, updatedAt: entry.updated_at };
  }

  async download(url: string): Promise<Uint8Array> {
    const response = await this.request(url);
    return new Uint8Array(await response.arrayBuffer());
  }

  /** Every oracle_id returned by a search, following all result pages. */
  async searchOracleIds(query: string): Promise<string[]> {
    const ids = new Set<string>();
    let url: string | undefined = `${ScryfallClient.API_URL}/cards/search?q=${encodeURIComponent(query)}&unique=cards`;
    while (url) {
      await this.sleep(this.requestDelayMs);
      const page: SearchPage = await this.getJson<SearchPage>(url);
      for (const card of page.data) if (card.oracle_id) ids.add(card.oracle_id);
      url = page.has_more ? page.next_page : undefined;
    }
    return [...ids].sort();
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
