/**
 * `pnpm data:embed` — semantic artifacts for the browser (RN-25, RN-26).
 * Run `pnpm data:fetch` first. The first run downloads the model into
 * .cache/models; later runs reuse it.
 */
import { join } from "node:path";
import { readYaml, repoPaths } from "@recom-tcg/rules-schema";
import { isDeckCard } from "../build/build-card-data.ts";
import { buildEmbeddings, type EmbeddingCard } from "../embeddings/build-embeddings.ts";
import { embeddingText } from "../embeddings/embedding-text.ts";
import { TransformersEmbedder } from "../embeddings/transformers-embedder.ts";
import { toEngineCard, toRuleInput } from "../normalize.ts";
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
const raw = new RawDataStore(paths.rawData).load();
const commanderIds = new Set(raw.commanderIds);

const cards: EmbeddingCard[] = raw.oracleCards.filter(isDeckCard).map((card) => {
  const engineCard = toEngineCard(card, commanderIds);
  return {
    oracleId: engineCard.oracleId,
    text: embeddingText(toRuleInput(card)),
    colorIdentity: engineCard.colorIdentity,
    canBeCommander: engineCard.canBeCommander
  };
});

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

console.log(`Embedding ${cards.length} cards with ${semantic.model}…`);
const artifacts = await buildEmbeddings(cards, embedder, settings, report);
new ArtifactStore(paths.outData).saveEmbeddings(artifacts);

const megabytes = (artifacts.vectors.byteLength / 1_048_576).toFixed(1);
console.log(`✓ ${cards.length} vectors × ${settings.dimensions} dims (${megabytes} MB) · ${Object.keys(artifacts.calibration).length} commanders calibrated`);
