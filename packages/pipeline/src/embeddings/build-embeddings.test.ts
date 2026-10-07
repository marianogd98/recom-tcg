/**
 * The whole semantic build, end to end, with a fake embedder:
 * no model download, no network, a few milliseconds.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineInt8, percentileOf } from "@recom-tcg/engine";
import type { Embedder } from "./embedder.ts";
import { buildEmbeddings, type EmbeddingCard } from "./build-embeddings.ts";

/** Bag-of-words hashed into 32 dimensions: texts sharing words get similar vectors. */
const fakeEmbedder: Embedder = {
  modelId: "fake/bag-of-words",
  async embed(texts) {
    return texts.map((text) => {
      const v = new Float32Array(32);
      for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
        let h = 0;
        for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        v[h % 32]! += 1;
      }
      return v;
    });
  }
};

const card = (oracleId: string, text: string, colorIdentity: EmbeddingCard["colorIdentity"], canBeCommander = false): EmbeddingCard => ({
  oracleId,
  text,
  colorIdentity,
  canBeCommander
});

const cards: EmbeddingCard[] = [
  card("meren", "whenever another creature you control dies return creature card from graveyard", ["B", "G"], true),
  card("blood-artist", "whenever another creature dies target player loses life", ["B"]),
  card("zulaport", "whenever another creature you control dies each opponent loses life", ["B"]),
  card("viscera-seer", "sacrifice a creature scry", ["B"]),
  card("elves", "tap add green mana", ["G"]),
  card("cultivate", "search your library for basic land cards put onto battlefield", ["G"]),
  card("counterspell", "counter target spell", ["U"]),
  card("lightning", "deal damage to any target", ["R"])
];

const settings = { dimensions: 6, batchSize: 3, calibrationSample: 100 };

test("produces one int8 row per card at the requested size", async () => {
  const { header, vectors } = await buildEmbeddings(cards, fakeEmbedder, settings);
  assert.equal(header.dimensions, 6);
  assert.equal(header.model, "fake/bag-of-words");
  assert.deepEqual(header.oracleIds, cards.map((c) => c.oracleId));
  assert.equal(vectors.length, cards.length * 6);
});

test("cards that do similar things stay close after PCA and int8", async () => {
  const { vectors } = await buildEmbeddings(cards, fakeEmbedder, settings);
  const row = (id: string) => {
    const i = cards.findIndex((c) => c.oracleId === id);
    return vectors.subarray(i * 6, (i + 1) * 6);
  };
  assert.ok(cosineInt8(row("blood-artist"), row("zulaport")) > cosineInt8(row("blood-artist"), row("cultivate")));
});

test("only commanders are calibrated, against cards of their identity (RN-26)", async () => {
  const { calibration, header } = await buildEmbeddings(cards, fakeEmbedder, settings);
  assert.deepEqual(Object.keys(calibration), ["meren"]);
  const quantiles = calibration["meren"]!;
  assert.equal(quantiles.length, header.quantileLevels.length);
  // Quantiles are sorted, so percentileOf can read them.
  assert.deepEqual([...quantiles].sort((a, b) => a - b), quantiles);
  assert.equal(percentileOf(quantiles.at(-1)!, quantiles), 1);
});

test("reports progress for each step", async () => {
  const steps = new Set<string>();
  await buildEmbeddings(cards, fakeEmbedder, settings, (step) => steps.add(step));
  assert.deepEqual([...steps], ["embed", "calibrate"]);
});
