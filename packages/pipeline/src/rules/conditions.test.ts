/**
 * Unit tests for the match operators, with rules built in memory:
 * no YAML files, no file system. This is possible because compiling a
 * rule only needs its definition and the macros.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { RuleDefinition } from "@recom-tcg/rules-schema";
import { compileRule } from "./compile.ts";
import { matchRule } from "./match.ts";
import type { RuleInput } from "./rule-input.ts";

const macros = { N: "(?:a|an|\\d+)" };

const rule = (match: RuleDefinition["match"], extra: Partial<RuleDefinition> = {}): RuleDefinition => ({
  id: "test.rule",
  theme: "tokens",
  provides: "gives",
  weight: 1,
  match,
  examples: { match: ["Anything"] },
  ...extra
});

const card = (faces: string[], typeLine = "Creature — Elf", extra: Partial<RuleInput> = {}): RuleInput => ({
  faces,
  typeLine,
  keywords: [],
  producesMana: false,
  producedColors: [],
  ...extra
});

test("text_any expands macros", () => {
  const compiled = compileRule(rule({ text_any: ["create {N} 1/1"] }), macros);
  assert.ok(matchRule(card(["create two 1/1 tokens"]), compiled) === null);
  assert.ok(matchRule(card(["create a 1/1 green elf"]), compiled) !== null);
});

test("text conditions must hold on the same face", () => {
  const compiled = compileRule(rule({ text_any: ["draw a card"], text_none: ["discard"] }), macros);
  // Face 1 draws AND discards (excluded); face 2 draws cleanly (matches).
  assert.ok(matchRule(card(["draw a card, then discard a card", "draw a card"]), compiled) !== null);
  assert.ok(matchRule(card(["draw a card, then discard a card"]), compiled) === null);
});

test("card conditions gate the whole card", () => {
  const compiled = compileRule(rule({ type_any: ["artifact"], produces_mana: true }), macros);
  assert.ok(matchRule(card([""], "Artifact", { producesMana: true }), compiled) !== null);
  assert.ok(matchRule(card([""], "Artifact"), compiled) === null);
  assert.ok(matchRule(card([""], "Creature", { producesMana: true }), compiled) === null);
});

test("produces_colors_min counts distinct colors of mana (fixing)", () => {
  const compiled = compileRule(rule({ produces_colors_min: 2 }), macros);
  assert.ok(matchRule(card([""], "Land", { producedColors: ["G", "U"] }), compiled) !== null);
  assert.ok(matchRule(card([""], "Artifact", { producedColors: ["G", "G"] }), compiled) === null);
});

test("capture returns the named group", () => {
  const compiled = compileRule(
    rule({ text_any: ["other (?<creature_type>\\w+) creatures get"] }, { capture: "creature_type" }),
    macros
  );
  assert.deepEqual(matchRule(card(["other elf creatures get +1/+1."]), compiled), { captured: "elf" });
});

test("unknown operators fail loudly", () => {
  const bad = rule({ mana_value_max: 3 } as unknown as RuleDefinition["match"]);
  assert.throws(() => compileRule(bad, macros), /unknown match operator "mana_value_max"/);
});
