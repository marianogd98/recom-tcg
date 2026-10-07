import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Card, ImportProfile, NonDeckNameIndex } from "@recom-tcg/engine";
import type { Manifest } from "../build/build-card-data.ts";
import type { NameIndex } from "../build/build-name-index.ts";
import type { EmbeddingArtifacts } from "../embeddings/build-embeddings.ts";

/** Writes the files the browser downloads into data/out/. */
export class ArtifactStore {
  constructor(private readonly dir: string) {}

  save(cards: Card[], manifest: Manifest): void {
    this.write("cards.json", JSON.stringify(cards));
    this.write("manifest.json", JSON.stringify(manifest, null, 2));
  }

  /** names.es.json and friends: what the importer reads to accept lists in other languages (RN-11). */
  saveNameIndex(lang: string, index: NameIndex): void {
    this.write(`names.${lang}.json`, JSON.stringify(index));
  }

  /**
   * What else the importer needs in the browser (bloque 2): token and
   * emblem names to ignore (RN-18), the CSV profiles (RN-14), and the model
   * parameters, which include the typo thresholds (RN-23).
   */
  saveImportSupport(nonDeckNames: NonDeckNameIndex, profiles: ImportProfile[], model: unknown): void {
    this.write("non-deck-names.json", JSON.stringify(nonDeckNames));
    this.write("import-profiles.json", JSON.stringify(profiles, null, 2));
    this.write("model.json", JSON.stringify(model, null, 2));
  }

  /**
   * embeddings.bin holds raw int8 bytes (no JSON overhead); embeddings.json
   * says how to read them; semantic-calibration.json holds the quantiles
   * per commander (RN-26).
   */
  saveEmbeddings({ header, vectors, calibration }: EmbeddingArtifacts): void {
    this.write("embeddings.bin", new Uint8Array(vectors.buffer, vectors.byteOffset, vectors.byteLength));
    this.write("embeddings.json", JSON.stringify(header));
    this.write("semantic-calibration.json", JSON.stringify(calibration));
  }

  /** Reads back what save() wrote; data:embed builds on it. */
  loadCards(): { cards: Card[]; manifest: Manifest } {
    return { cards: this.readJson<Card[]>("cards.json"), manifest: this.readJson<Manifest>("manifest.json") };
  }

  /** Everything the importer reads, exactly as the browser will receive it. */
  loadImportSupport(): {
    cards: Card[];
    manifest: Manifest;
    localized: NameIndex[];
    nonDeckNames: NonDeckNameIndex;
    profiles: ImportProfile[];
    model: unknown;
  } {
    const { cards, manifest } = this.loadCards();
    return {
      cards,
      manifest,
      localized: Object.keys(manifest.localizedNames).map((lang) => this.readJson<NameIndex>(`names.${lang}.json`)),
      nonDeckNames: this.readJson<NonDeckNameIndex>("non-deck-names.json"),
      profiles: this.readJson<ImportProfile[]>("import-profiles.json"),
      model: this.readJson<unknown>("model.json")
    };
  }

  private readJson<T>(file: string): T {
    const path = join(this.dir, file);
    try {
      return JSON.parse(readFileSync(path, "utf8")) as T;
    } catch (error) {
      throw new Error(`Cannot read ${path}. Did you run "pnpm data:build"? (${(error as Error).message})`);
    }
  }

  private write(file: string, content: string | Uint8Array): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, file), content);
  }
}
