import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "../types.ts";
import { isInCommanderPool, openEmbeddingTable, type EmbeddingHeader } from "./artifacts.ts";

const card = (oracleId: string, legality: Card["legality"] = "legal"): Card => ({
  oracleId,
  name: oracleId,
  manaValue: 1,
  colorIdentity: [],
  typeLine: "Artifact",
  keywords: [],
  legality,
  canBeCommander: false,
  copyLimit: null,
  landValue: 0,
  themes: [],
  roles: []
});

const header = (overrides: Partial<EmbeddingHeader> = {}): EmbeddingHeader => ({
  model: "test",
  dimensions: 2,
  quantization: "int8",
  dataDate: "2026-10-06",
  cardCount: 3,
  cardIndexes: [0, 2],
  quantileLevels: [0, 1],
  ...overrides
});

test("legal and banned cards are in the Commander pool; the rest are not", () => {
  assert.equal(isInCommanderPool(card("a", "legal")), true);
  assert.equal(isInCommanderPool(card("a", "banned")), true);
  assert.equal(isInCommanderPool(card("a", "not_legal")), false);
});

test("rows are matched to cards through cardIndexes", () => {
  const cards = [card("first"), card("skipped", "not_legal"), card("third")];
  const table = openEmbeddingTable(header(), Int8Array.from([127, 0, 0, 127]), cards);
  assert.deepEqual([...table.vectorOf("third")!], [0, 127]);
  assert.equal(table.vectorOf("skipped"), undefined);
});

test("files from different builds are rejected", () => {
  assert.throws(() => openEmbeddingTable(header({ cardCount: 4 }), new Int8Array(4), [card("a"), card("b"), card("c")]), /Run "pnpm data:build"/);
});
