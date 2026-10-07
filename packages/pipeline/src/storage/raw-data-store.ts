import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScryfallCard } from "../scryfall/types.ts";

/** What `data:fetch` downloads and `data:build` reads. */
export interface RawData {
  oracleCards: ScryfallCard[];
  /** oracle_ids from the search is:commander (RN-01). */
  commanderIds: string[];
  /** Date of the bulk file, stamped on every result (RN-21). */
  updatedAt: string;
}

/**
 * Reads and writes data/raw/. Only this class knows the file names, so the
 * fetch and build steps talk about data, not about files.
 */
export class RawDataStore {
  private static readonly FILES = {
    oracleCards: "oracle-cards.json",
    commanderIds: "commanders.json",
    meta: "meta.json"
  } as const;

  constructor(private readonly dir: string) {}

  saveOracleCards(bytes: Uint8Array): void {
    this.write(RawDataStore.FILES.oracleCards, bytes);
  }

  saveCommanderIds(ids: string[]): void {
    this.write(RawDataStore.FILES.commanderIds, JSON.stringify(ids));
  }

  saveUpdatedAt(updatedAt: string): void {
    this.write(RawDataStore.FILES.meta, JSON.stringify({ updated_at: updatedAt }, null, 2));
  }

  load(): RawData {
    const meta = this.readJson<{ updated_at: string }>(RawDataStore.FILES.meta);
    return {
      oracleCards: this.readJson<ScryfallCard[]>(RawDataStore.FILES.oracleCards),
      commanderIds: this.readJson<string[]>(RawDataStore.FILES.commanderIds),
      updatedAt: meta.updated_at
    };
  }

  private write(file: string, content: string | Uint8Array): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, file), content);
  }

  private readJson<T>(file: string): T {
    const path = join(this.dir, file);
    try {
      return JSON.parse(readFileSync(path, "utf8")) as T;
    } catch (error) {
      throw new Error(`Cannot read ${path}. Did you run "pnpm data:fetch"? (${(error as Error).message})`);
    }
  }
}
