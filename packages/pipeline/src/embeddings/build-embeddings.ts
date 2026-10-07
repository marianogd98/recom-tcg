import { cosineInt8, isSubsetOf, normalize, quantiles, quantize, QUANTILE_LEVELS, type Color } from "@recom-tcg/engine";
import type { Embedder } from "./embedder.ts";
import { fitPca, project } from "./pca.ts";

/** One card as the embedding step needs it. */
export interface EmbeddingCard {
  oracleId: string;
  text: string;
  colorIdentity: Color[];
  canBeCommander: boolean;
}

/** From model.yaml → semantic. */
export interface EmbeddingSettings {
  dimensions: number;
  batchSize: number;
  calibrationSample: number;
}

/** Describes embeddings.bin so the browser can read it (RN-21). */
export interface EmbeddingHeader {
  model: string;
  dimensions: number;
  quantization: "int8";
  oracleIds: string[];
  quantileLevels: readonly number[];
}

export interface EmbeddingArtifacts {
  header: EmbeddingHeader;
  /** oracleIds.length × dimensions int8 values, row by row. */
  vectors: Int8Array;
  /** Per commander oracle id: quantiles of its similarity to cards of its identity (RN-26). */
  calibration: Record<string, number[]>;
}

export type ProgressReporter = (step: string, done: number, total: number) => void;

/**
 * The semantic build, from texts to browser-ready artifacts:
 *   1. embed every card text in batches
 *   2. fit PCA and reduce to `dimensions`
 *   3. re-normalize and quantize to int8
 *   4. calibrate every commander against cards of its identity
 *
 * No file system and no specific model: the embedder is injected.
 */
export async function buildEmbeddings(
  cards: readonly EmbeddingCard[],
  embedder: Embedder,
  settings: EmbeddingSettings,
  report: ProgressReporter = () => {}
): Promise<EmbeddingArtifacts> {
  const raw = await embedAll(cards, embedder, settings.batchSize, report);

  const pca = fitPca(raw, settings.dimensions);
  const vectors = new Int8Array(cards.length * settings.dimensions);
  raw.forEach((vector, row) => vectors.set(quantize(normalize(project(pca, vector))), row * settings.dimensions));

  const rowOf = (row: number) => vectors.subarray(row * settings.dimensions, (row + 1) * settings.dimensions);
  const calibration = calibrateCommanders(cards, rowOf, settings.calibrationSample, report);

  return {
    header: {
      model: embedder.modelId,
      dimensions: settings.dimensions,
      quantization: "int8",
      oracleIds: cards.map((card) => card.oracleId),
      quantileLevels: QUANTILE_LEVELS
    },
    vectors,
    calibration
  };
}

async function embedAll(
  cards: readonly EmbeddingCard[],
  embedder: Embedder,
  batchSize: number,
  report: ProgressReporter
): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let start = 0; start < cards.length; start += batchSize) {
    const batch = cards.slice(start, start + batchSize).map((card) => card.text);
    out.push(...(await embedder.embed(batch)));
    report("embed", Math.min(start + batchSize, cards.length), cards.length);
  }
  return out;
}

/**
 * RN-26: for each commander, the similarity distribution against the cards
 * it could play (identity ⊆ its identity), summarized as quantiles.
 * Large pools are sampled evenly so the build stays fast and deterministic.
 */
function calibrateCommanders(
  cards: readonly EmbeddingCard[],
  rowOf: (row: number) => Int8Array,
  sampleSize: number,
  report: ProgressReporter
): Record<string, number[]> {
  const calibration: Record<string, number[]> = {};
  const commanders = cards.map((card, row) => ({ card, row })).filter(({ card }) => card.canBeCommander);

  commanders.forEach(({ card: commander, row: commanderRow }, index) => {
    const playable = cards
      .map((card, row) => ({ card, row }))
      .filter(({ card, row }) => row !== commanderRow && isSubsetOf(card.colorIdentity, commander.colorIdentity));
    if (playable.length > 0) {
      const sample = evenlySpaced(playable, sampleSize);
      const similarities = sample.map(({ row }) => cosineInt8(rowOf(commanderRow), rowOf(row)));
      calibration[commander.oracleId] = quantiles(similarities).map((q) => Number(q.toFixed(4)));
    }
    report("calibrate", index + 1, commanders.length);
  });
  return calibration;
}

function evenlySpaced<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  const step = items.length / max;
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)]!);
}
