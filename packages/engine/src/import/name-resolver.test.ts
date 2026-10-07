import { test } from "node:test";
import assert from "node:assert/strict";
import { NameResolver, type FuzzyMatchOptions } from "./name-resolver.ts";

const fuzzy: FuzzyMatchOptions = { maxDistance: 2, maxRatio: 0.25, maxSuggestions: 5 };

const resolver = new NameResolver(
  {
    cards: [
      { oracleId: "bolt", name: "Lightning Bolt" },
      { oracleId: "elves", name: "Llanowar Elves" },
      { oracleId: "delver", name: "Delver of Secrets // Insectile Aberration" },
      { oracleId: "fire-ice", name: "Fire // Ice" },
      { oracleId: "opt", name: "Opt" },
      { oracleId: "mox-ruby", name: "Mox Ruby" },
      { oracleId: "mox-ruby-like", name: "Mox Rubi" },
      { oracleId: "emeritus", name: "Emeritus of Conflict // Lightning Bolt" }
    ],
    localized: [{ "elfos de llanowar": ["elves"], "rayo": ["bolt"] }],
    nonDeck: { treasure: "token", "elf warrior": "token" }
  },
  fuzzy
);

test("English names, without case or accents (RN-13)", () => {
  assert.deepEqual(resolver.resolve("LIGHTNING bolt"), { status: "recognized", oracleId: "bolt" });
});

test("any face of a double-faced card, or the full name (RN-12)", () => {
  assert.deepEqual(resolver.resolve("Insectile Aberration"), { status: "recognized", oracleId: "delver" });
  assert.deepEqual(resolver.resolve("Delver of Secrets // Insectile Aberration"), { status: "recognized", oracleId: "delver" });
});

test("a card's full name beats another card's face with the same name", () => {
  assert.deepEqual(resolver.resolve("Lightning Bolt"), { status: "recognized", oracleId: "bolt" });
  assert.deepEqual(resolver.resolve("Lightinng Bolt"), { status: "corrected", oracleId: "bolt", distance: 1 });
  assert.deepEqual(resolver.resolve("Emeritus of Conflict"), { status: "recognized", oracleId: "emeritus" });
});

test("split cards typed with a single slash", () => {
  assert.deepEqual(resolver.resolve("Fire / Ice"), { status: "recognized", oracleId: "fire-ice" });
});

test("Spanish names from the localized index (RN-11)", () => {
  assert.deepEqual(resolver.resolve("Elfos de Llanowar"), { status: "recognized", oracleId: "elves" });
});

test("tokens are ignored, not reported as unknown (RN-18)", () => {
  assert.deepEqual(resolver.resolve("Treasure"), { status: "ignored", kind: "token" });
});

test("one close spelling is corrected and flagged", () => {
  assert.deepEqual(resolver.resolve("Lightinng Bolt"), { status: "corrected", oracleId: "bolt", distance: 1 });
  assert.deepEqual(resolver.resolve("Elfos de Llanowr"), { status: "corrected", oracleId: "elves", distance: 1 });
});

test("several equally close spellings make the line ambiguous", () => {
  assert.deepEqual(resolver.resolve("Mox Rubu"), { status: "ambiguous", candidates: ["mox-ruby", "mox-ruby-like"] });
});

test("short names are never 'corrected' into another card", () => {
  assert.deepEqual(resolver.resolve("Opz"), { status: "unrecognized" });
});

test("nothing close enough is unrecognized", () => {
  assert.deepEqual(resolver.resolve("Black Lotus"), { status: "unrecognized" });
});
