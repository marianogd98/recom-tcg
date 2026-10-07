import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Card } from "@recom-tcg/engine";
import type { Manifest } from "../build/build-card-data.ts";

/** Writes the files the browser downloads into data/out/. */
export class ArtifactStore {
  constructor(private readonly dir: string) {}

  save(cards: Card[], manifest: Manifest): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, "cards.json"), JSON.stringify(cards));
    writeFileSync(join(this.dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  }
}
