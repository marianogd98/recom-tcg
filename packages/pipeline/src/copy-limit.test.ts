import { test } from "node:test";
import assert from "node:assert/strict";
import { copyLimitOf } from "./copy-limit.ts";

// Normalized Oracle text, as copied from the 2026 Scryfall data.
const card = (text: string, typeLine = "Creature — Rat") => ({ faces: [text], typeLine });

test("any number of copies (Relentless Rats, Shadowborn Apostle…)", () => {
  assert.equal(copyLimitOf(card("a deck can have any number of cards named ~.\n~ gets +1/+1 for each other creature on the battlefield named ~.")), "any");
});

test("a written-out limit (Seven Dwarves, Nazgûl)", () => {
  assert.equal(copyLimitOf(card("~ gets +1/+1 for each other creature named ~ you control.\na deck can have up to seven cards named ~.")), 7);
  assert.equal(copyLimitOf(card("deathtouch\na deck can have up to nine cards named ~.")), 9);
});

test("\"only one\" is just singleton (Once More with Feeling)", () => {
  assert.equal(copyLimitOf(card("a deck can have only one card named ~.", "Sorcery")), 1);
});

test("basic lands, snow ones included (RN-17)", () => {
  assert.equal(copyLimitOf(card("", "Basic Land — Forest")), "any");
  assert.equal(copyLimitOf(card("", "Basic Snow Land — Swamp")), "any");
});

test("everything else is singleton", () => {
  assert.equal(copyLimitOf(card("flying", "Creature — Bird")), 1);
  assert.equal(copyLimitOf(card("", "Land — Forest Island")), 1);
});
