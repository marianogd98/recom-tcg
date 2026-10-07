import { test } from "node:test";
import assert from "node:assert/strict";
import { isBasicLand, usableCopies } from "./copies.ts";

const card = (copyLimit: number | "any", typeLine = "Creature — Rat") => ({ copyLimit, typeLine });

test("a normal card counts once, however many copies the user owns (RN-15)", () => {
  assert.equal(usableCopies(card(1), 4), 1);
});

test("cards with a limit count min(owned, limit) (RN-16)", () => {
  assert.equal(usableCopies(card(7), 3), 3);
  assert.equal(usableCopies(card(7), 12), 7);
  assert.equal(usableCopies(card("any"), 23), 23);
});

test("basic lands are unlimited by default, or as owned when asked (RN-17)", () => {
  const plains = card("any", "Basic Land — Plains");
  assert.equal(usableCopies(plains, 2), Number.POSITIVE_INFINITY);
  assert.equal(usableCopies(plains, 2, { unlimitedBasics: false }), 2);
});

test("a card the user doesn't own gives nothing", () => {
  assert.equal(usableCopies(card("any", "Basic Land — Plains"), 0), 0);
});

test("recognizes snow basics and Wastes, but not nonbasic lands", () => {
  assert.equal(isBasicLand({ typeLine: "Basic Snow Land — Island" }), true);
  assert.equal(isBasicLand({ typeLine: "Basic Land" }), true);
  assert.equal(isBasicLand({ typeLine: "Land — Forest Island" }), false);
  assert.equal(isBasicLand({ typeLine: "Legendary Land" }), false);
});
