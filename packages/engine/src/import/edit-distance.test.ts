import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedEditDistance } from "./edit-distance.ts";

test("counts insertions, deletions and substitutions", () => {
  assert.equal(boundedEditDistance("sol ring", "sol ring", 3), 0);
  assert.equal(boundedEditDistance("sol rin", "sol ring", 3), 1);
  assert.equal(boundedEditDistance("sol rings", "sol ring", 3), 1);
  assert.equal(boundedEditDistance("sol rong", "sol ring", 3), 1);
});

test("a swap of two neighbouring letters is one edit", () => {
  assert.equal(boundedEditDistance("lightinng bolt", "lightning bolt", 3), 1);
});

test("stops at max + 1 instead of computing large distances", () => {
  assert.equal(boundedEditDistance("ponder", "lightning bolt", 2), 3);
  assert.equal(boundedEditDistance("abcdef", "uvwxyz", 2), 3);
});

test("empty strings", () => {
  assert.equal(boundedEditDistance("", "abc", 3), 3);
  assert.equal(boundedEditDistance("", "abcd", 3), 4);
});
