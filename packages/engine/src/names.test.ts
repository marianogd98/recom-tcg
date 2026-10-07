import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCardName } from "./names.ts";

test("ignores case and accents (RN-13)", () => {
  assert.equal(normalizeCardName("Elfos de Llanowar"), "elfos de llanowar");
  assert.equal(normalizeCardName("Sanadora de Ánimos"), "sanadora de animos");
  assert.equal(normalizeCardName("Nazgûl"), "nazgul");
});

test("ñ matches n, so a list typed without it still resolves", () => {
  assert.equal(normalizeCardName("Montaña"), normalizeCardName("Montana"));
});

test("old Æ spellings match today's Ae", () => {
  assert.equal(normalizeCardName("Æther Vial"), normalizeCardName("Aether Vial"));
});

test("curly quotes and extra spaces don't matter", () => {
  assert.equal(normalizeCardName("  Urza’s   Saga "), "urza's saga");
});

test("keeps the separator of double-faced names (RN-12)", () => {
  assert.equal(normalizeCardName("Delver of Secrets // Insectile Aberration"), "delver of secrets // insectile aberration");
});
