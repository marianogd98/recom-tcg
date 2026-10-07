import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseBulkCards, type BulkFormat } from "../scryfall/bulk-file.ts";
import type { ScryfallCard } from "../scryfall/types.ts";

/** What `data:fetch` downloads and `data:build` reads. */
export interface RawData {
  oracleCards: ScryfallCard[];
  /** oracle_ids from the search is:commander (RN-01). */
  commanderIds: string[];
  /** Date of the bulk file, stamped on every result (RN-21). */
  updatedAt: string;
}

/** Saved next to the downloads: when the bulk file was made and how to read it. */
export interface RawMeta {
  updatedAt: string;
  format: BulkFormat;
}

/**
 * Reads and writes data/raw/. Only this class knows the file names, so the
 * fetch and build steps talk about data, not about files.
 */
export class RawDataStore {
  private static readonly FILES = {
    oracleCards: { json: "oracle-cards.json", jsonl: "oracle-cards.jsonl" },
    commanderIds: "commanders.json",
    meta: "meta.json"
  } as const;

  constructor(private readonly dir: string) {}

  /** Stores the bulk file as downloaded (already decompressed), in its own format. */
  saveOracleCards(bytes: Uint8Array, format: BulkFormat): void {
    this.write(RawDataStore.FILES.oracleCards[format], bytes);
  }

  saveCommanderIds(ids: string[]): void {
    this.write(RawDataStore.FILES.commanderIds, JSON.stringify(ids));
  }

  saveMeta(meta: RawMeta): void {
    this.write(RawDataStore.FILES.meta, JSON.stringify({ updated_at: meta.updatedAt, format: meta.format }, null, 2));
  }

  load(): RawData {
    const meta = this.readJson<{ updated_at: string; format?: BulkFormat }>(RawDataStore.FILES.meta);
    // Data fetched before JSON Lines existed has no format: it is a JSON array.
    const format = meta.format ?? "json";
    return {
      oracleCards: parseBulkCards(this.readText(RawDataStore.FILES.oracleCards[format]), format),
      commanderIds: this.readJson<string[]>(RawDataStore.FILES.commanderIds),
      updatedAt: meta.updated_at
    };
  }

  private write(file: string, content: string | Uint8Array): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, file), content);
  }

  private readJson<T>(file: string): T {
    return JSON.parse(this.readText(file)) as T;
  }

  private readText(file: string): string {
    const path = join(this.dir, file);
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      throw new Error(`Cannot read ${path}. Did you run "pnpm data:fetch"? (${(error as Error).message})`);
    }
  }
}
