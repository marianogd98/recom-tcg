/**
 * `pnpm data:embed` — semantic artifacts for the browser (RN-25, RN-26).
 * Run `pnpm data:fetch` and `pnpm data:build` first: vectors are attached to
 * the cards of data/out/cards.json by position. The first run downloads the
 * model into .cache/models; later runs reuse it.
 */
import { join } from "node:path";
import { readYaml, repoPaths } from "@recom-tcg/rules-schema";
import { buildEmbeddings } from "../embeddings/build-embeddings.ts";
import { selectEmbeddingCards } from "../embeddings/select-cards.ts";
import { TransformersEmbedder } from "../embeddings/transformers-embedder.ts";
import { ArtifactStore } from "../storage/artifact-store.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

interface SemanticConfig {
  model: string;
  dimensions: number;
  batch_size: number;
  calibration_sample: number;
}

const paths = repoPaths(import.meta.dirname);
const { semantic } = readYaml<{ semantic: SemanticConfig }>(paths.model);
const artifacts = new ArtifactStore(paths.outData);

const { cards, manifest } = artifacts.loadCards();
const raw = new RawDataStore(paths.rawData).load();
if (raw.updatedAt.slice(0, 10) !== manifest.dataDate) {
  throw new Error(`cards.json is from ${manifest.dataDate} but data/raw is from ${raw.updatedAt}. Run "pnpm data:build" first.`);
}

const rawByOracleId = new Map(raw.oracleCards.map((card) => [card.oracle_id ?? "", card]));
const selected = selectEmbeddingCards(cards, rawByOracleId);

const embedder = new TransformersEmbedder({ modelId: semantic.model, cacheDir: join(paths.root, ".cache/models") });
const settings = {
  dimensions: semantic.dimensions,
  batchSize: semantic.batch_size,
  calibrationSample: semantic.calibration_sample
};

let lastLine = "";
const report = (step: string, done: number, total: number) => {
  const line = `${step} ${Math.floor((done / total) * 100)}%`;
  if (line !== lastLine && (done === total || done % 2000 < settings.batchSize)) console.log(`  ${line} (${done}/${total})`);
  lastLine = line;
};

console.log(`Embedding ${selected.length} of ${cards.length} cards (Commander pool) with ${semantic.model}…`);
const result = await buildEmbeddings(selected, embedder, settings, { dataDate: manifest.dataDate, cardCount: cards.length }, report);
artifacts.saveEmbeddings(result);

const megabytes = (result.vectors.byteLength / 1_048_576).toFixed(1);
console.log(
  `✓ ${selected.length} vectors × ${settings.dimensions} dims (${megabytes} MB) · ` +
    `${Object.keys(result.calibration).length} commanders calibrated`
);
