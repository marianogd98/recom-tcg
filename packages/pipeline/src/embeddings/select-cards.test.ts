import { test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@recom-tcg/engine";
import type { ScryfallCard } from "../scryfall/types.ts";
import { selectEmbeddingCards } from "./select-cards.ts";

const card = (oracleId: string, legality: Card["legality"]): Card => ({
  oracleId,
  name: oracleId,
  manaValue: 1,
  colorIdentity: ["B"],
  typeLine: "Creature",
  keywords: [],
  legality,
  canBeCommander: false,
  copyLimit: null,
  landValue: 0,
  themes: [],
  roles: []
});

const raw = (oracleId: string): ScryfallCard => ({
  oracle_id: oracleId,
  name: oracleId,
  layout: "normal",
  type_line: "Creature — Zombie",
  oracle_text: `${oracleId} can't block.`,
  color_identity: ["B"],
  legalities: {}
});

const rawById = new Map(["legal", "banned", "unset"].map((id) => [id, raw(id)]));

test("embeds legal and banned cards, keeping their position in cards.json", () => {
  const cards = [card("unset", "not_legal"), card("legal", "legal"), card("banned", "banned")];
  const selected = selectEmbeddingCards(cards, rawById);
  assert.deepEqual(
    selected.map((c) => [c.cardIndex, c.oracleId]),
    [
      [1, "legal"],
      [2, "banned"]
    ]
  );
});

test("the text comes from the raw card, normalized like the rules see it", () => {
  const [selected] = selectEmbeddingCards([card("legal", "legal")], rawById);
  assert.equal(selected?.text, "creature — zombie\n~ can't block.");
});

test("cards missing from the raw data mean the two steps are out of sync", () => {
  assert.throws(() => selectEmbeddingCards([card("ghost", "legal")], rawById), /Run "pnpm data:build" again/);
});
