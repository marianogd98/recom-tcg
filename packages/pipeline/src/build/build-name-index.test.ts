import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNameIndex } from "./build-name-index.ts";

const cards = [
  { oracleId: "elves", name: "Llanowar Elves" },
  { oracleId: "ring", name: "Sol Ring" },
  { oracleId: "ponder", name: "Ponder" }
];

test("keys are normalized, so accents and case don't matter (RN-11, RN-13)", () => {
  const index = buildNameIndex([{ name: "Elfos de Llanowar", oracleId: "elves" }], cards);
  assert.deepEqual(index, { "elfos de llanowar": ["elves"] });
});

test("a name identical to the English one is left out", () => {
  assert.deepEqual(buildNameIndex([{ name: "Ponder", oracleId: "ponder" }], cards), {});
});

test("cards that are not in cards.json are left out", () => {
  assert.deepEqual(buildNameIndex([{ name: "Ficha de elfo", oracleId: "token" }], cards), {});
});

test("two cards with the same translation are both kept, for the user to choose", () => {
  const index = buildNameIndex(
    [
      { name: "Anillo", oracleId: "ring" },
      { name: "anillo", oracleId: "elves" }
    ],
    cards
  );
  assert.deepEqual(index, { anillo: ["elves", "ring"] });
});
