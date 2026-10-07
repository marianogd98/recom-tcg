import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineInt8, EmbeddingTable, normalize, quantize } from "./vector.ts";

test("normalize returns a unit-length copy", () => {
  const unit = normalize([3, 4]);
  assert.deepEqual([...unit].map((x) => Number(x.toFixed(6))), [0.6, 0.8]);
});

test("quantization keeps the cosine within a small error", () => {
  const a = normalize([0.2, -0.5, 0.9, 0.1]);
  const b = normalize([0.3, -0.4, 0.8, -0.2]);
  const exact = a.reduce((sum, x, i) => sum + x * b[i]!, 0);
  assert.ok(Math.abs(cosineInt8(quantize(a), quantize(b)) - exact) < 0.01);
});

test("identical vectors have cosine 1, opposite vectors -1", () => {
  const v = quantize(normalize([1, 2, 3]));
  const opposite = quantize(normalize([-1, -2, -3]));
  assert.ok(Math.abs(cosineInt8(v, v) - 1) < 1e-9);
  assert.ok(Math.abs(cosineInt8(v, opposite) + 1) < 1e-9);
});

test("the table looks rows up by oracle id without copying", () => {
  const table = new EmbeddingTable(["a", "b"], 2, Int8Array.from([127, 0, 0, 127]));
  assert.deepEqual([...table.vectorOf("b")!], [0, 127]);
  assert.equal(table.similarity("a", "b"), 0);
  assert.equal(table.vectorOf("missing"), undefined);
});

test("the table rejects a buffer of the wrong size", () => {
  assert.throws(() => new EmbeddingTable(["a"], 3, new Int8Array(2)), /expected 1 × 3/);
});
