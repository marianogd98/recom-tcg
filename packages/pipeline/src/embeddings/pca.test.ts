import { test } from "node:test";
import assert from "node:assert/strict";
import { fitPca, project } from "./pca.ts";

/** Points spread mostly along (1, 1, 0), a little along (1, -1, 0), almost nothing along z. */
function syntheticCloud(): Float32Array[] {
  const points: Float32Array[] = [];
  for (let i = -20; i <= 20; i++) {
    for (const j of [-2, 0, 2]) {
      points.push(Float32Array.from([i + j, i - j, (i % 3) * 0.01]));
    }
  }
  return points;
}

test("the first component follows the direction of largest spread", () => {
  const { components } = fitPca(syntheticCloud(), 2);
  const [first] = components;
  const expected = Math.SQRT1_2;
  assert.ok(Math.abs(Math.abs(first![0]!) - expected) < 1e-3);
  assert.ok(Math.abs(Math.abs(first![1]!) - expected) < 1e-3);
  assert.ok(Math.abs(first![2]!) < 1e-3);
});

test("components are unit length and orthogonal", () => {
  const [a, b] = fitPca(syntheticCloud(), 2).components;
  const dot = (x: Float32Array, y: Float32Array) => x.reduce((s, v, i) => s + v * y[i]!, 0);
  assert.ok(Math.abs(dot(a!, a!) - 1) < 1e-5);
  assert.ok(Math.abs(dot(a!, b!)) < 1e-5);
});

test("projection keeps k coordinates", () => {
  const model = fitPca(syntheticCloud(), 2);
  assert.equal(project(model, [1, 2, 3]).length, 2);
});

test("the same input always gives the same model (reproducible builds)", () => {
  const a = fitPca(syntheticCloud(), 2);
  const b = fitPca(syntheticCloud(), 2);
  assert.deepEqual([...a.components[0]!], [...b.components[0]!]);
});

test("asking for more components than dimensions fails", () => {
  assert.throws(() => fitPca(syntheticCloud(), 4), /Cannot keep 4 components/);
});
