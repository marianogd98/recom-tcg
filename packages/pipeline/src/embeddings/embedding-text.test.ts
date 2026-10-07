import { test } from "node:test";
import assert from "node:assert/strict";
import { embeddingText } from "./embedding-text.ts";

test("type line first, then each face; the card's own name is already ~", () => {
  const text = embeddingText({
    faces: ["whenever ~ or another creature dies, target player loses 1 life."],
    typeLine: "Creature — Vampire",
    keywords: [],
    producesMana: false,
    producedColors: []
  });
  assert.equal(text, "creature — vampire\nwhenever ~ or another creature dies, target player loses 1 life.");
});
