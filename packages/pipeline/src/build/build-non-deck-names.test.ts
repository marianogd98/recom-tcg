import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScryfallCard } from "../scryfall/types.ts";
import { buildNonDeckNames } from "./build-non-deck-names.ts";

const object = (name: string, layout: string, oracleId = `${layout}-${name}`): ScryfallCard => ({
  oracle_id: oracleId,
  name,
  layout,
  color_identity: [],
  legalities: {}
});

test("tokens, emblems and art cards are grouped by kind (RN-18)", () => {
  const index = buildNonDeckNames([
    object("Treasure", "token"),
    object("Emblem — Elspeth, Sun's Champion", "emblem"),
    object("Sol Ring", "art_series"),
    object("Day // Night", "double_faced_token")
  ]);
  assert.deepEqual(index, {
    day: "token",
    "day // night": "token",
    "emblem — elspeth, sun's champion": "emblem",
    night: "token",
    "sol ring": "art_card",
    treasure: "token"
  });
});

test("a token named like a real card is left out: the card wins", () => {
  const index = buildNonDeckNames([object("Llanowar Elves", "normal"), object("Llanowar Elves", "token")]);
  assert.deepEqual(index, {});
});
