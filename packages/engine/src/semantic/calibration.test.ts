import { test } from "node:test";
import assert from "node:assert/strict";
import { percentileOf, quantiles } from "./calibration.ts";

const LEVELS = [0, 0.5, 1];

test("quantiles interpolate between ranks", () => {
  assert.deepEqual(quantiles([4, 1, 3, 2], LEVELS), [1, 2.5, 4]);
});

test("percentileOf inverts quantiles", () => {
  const stored = quantiles([0, 10, 20, 30, 40], LEVELS); // [0, 20, 40]
  assert.equal(percentileOf(20, stored, LEVELS), 0.5);
  assert.equal(percentileOf(30, stored, LEVELS), 0.75);
});

test("values outside the sample clamp to 0 and 1", () => {
  const stored = [0.1, 0.3, 0.6];
  assert.equal(percentileOf(-1, stored, LEVELS), 0);
  assert.equal(percentileOf(0.9, stored, LEVELS), 1);
});

test("the same cosine means different things for different commanders (RN-26)", () => {
  const generous = [0.3, 0.6, 0.9]; // text similar to almost everything
  const narrow = [0.0, 0.1, 0.5]; // text similar to few cards
  assert.ok(percentileOf(0.45, narrow, LEVELS) > percentileOf(0.45, generous, LEVELS));
});

test("empty samples are rejected", () => {
  assert.throws(() => quantiles([], LEVELS), /empty sample/);
});
