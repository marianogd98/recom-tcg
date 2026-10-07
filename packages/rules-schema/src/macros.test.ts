import { test } from "node:test";
import assert from "node:assert/strict";
import { compilePattern, expandMacros } from "./index.ts";

const macros = { N: "(?:a|an|\\d+)" };

test("expands known macros", () => {
  assert.equal(expandMacros("create {N} tokens?", macros), "create (?:a|an|\\d+) tokens?");
});

test("leaves regex quantifiers alone", () => {
  assert.equal(expandMacros("land.{0,80}battlefield", macros), "land.{0,80}battlefield");
});

test("throws on unknown macros", () => {
  assert.throws(() => expandMacros("create {M} tokens", macros), /Unknown macro \{M\}/);
});

test("compiled patterns are case-insensitive", () => {
  assert.ok(compilePattern("legendary creature", macros).test("Legendary Creature — Human Shaman"));
});
