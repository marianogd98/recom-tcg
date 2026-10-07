import { test } from "node:test";
import assert from "node:assert/strict";
import { identityKey, matchesSelection } from "./identity.ts";

test("identity keys follow WUBRG order", () => {
  assert.equal(identityKey(["G", "B"]), "BG");
  assert.equal(identityKey(["G", "W", "B"]), "WBG");
  assert.equal(identityKey([]), "");
});

test("exact match by default (RN-05)", () => {
  const sel = { identities: ["WBG"], includeSubsets: false };
  assert.equal(matchesSelection(["W", "B", "G"], sel), true);
  assert.equal(matchesSelection(["B", "G"], sel), false);
});

test("subsets only when enabled (RN-05)", () => {
  const sel = { identities: ["WBG"], includeSubsets: true };
  assert.equal(matchesSelection(["B", "G"], sel), true);
  assert.equal(matchesSelection(["G"], sel), true);
  assert.equal(matchesSelection(["U", "G"], sel), false);
});

test("colorless only when explicitly selected (RN-06)", () => {
  assert.equal(matchesSelection([], { identities: ["WBG"], includeSubsets: true }), false);
  assert.equal(matchesSelection([], { identities: [""], includeSubsets: false }), true);
});
