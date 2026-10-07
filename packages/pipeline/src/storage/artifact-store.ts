import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Card } from "@recom-tcg/engine";
import type { Manifest } from "../build/build-card-data.ts";
import type { EmbeddingArtifacts } from "../embeddings/build-embeddings.ts";

/** Writes the files the browser downloads into data/out/. */
export class ArtifactStore {
  constructor(private readonly dir: string) {}

  save(cards: Card[], manifest: Manifest): void {
    this.write("cards.json", JSON.stringify(cards));
    this.write("manifest.json", JSON.stringify(manifest, null, 2));
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
