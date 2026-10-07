import { test } from "node:test";
import assert from "node:assert/strict";
import { foldName, normalizeOracleText } from "./text.ts";

test("replaces the card's own name with ~ and lowercases", () => {
  const out = normalizeOracleText(
    "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
    "Blood Artist"
  );
  assert.equal(out, "whenever ~ or another creature dies, target player loses 1 life and you gain 1 life.");
});

test("also replaces the short name of a legendary", () => {
  const out = normalizeOracleText("Karador costs {1} less to cast.", "Karador, Ghost Chieftain");
  assert.equal(out, "~ costs {1} less to cast.");
});

test("removes reminder text", () => {
  const out = normalizeOracleText("Flying (This creature can't be blocked except by creatures with flying or reach.)", "Bird");
  assert.equal(out, "flying");
});

test("folds case and diacritics for name matching", () => {
  assert.equal(foldName("  Artista  de SANGRE "), "artista de sangre");
  assert.equal(foldName("Éowyn"), "eowyn");
});
