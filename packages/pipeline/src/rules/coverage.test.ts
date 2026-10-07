import { test } from "node:test";
import assert from "node:assert/strict";
import { compileRule } from "./compile.ts";
import { measureCoverage } from "./coverage.ts";
import type { RuleInput } from "./rule-input.ts";

const input = (text: string): RuleInput => ({ faces: [text], typeLine: "Creature", keywords: [], producesMana: false, producedColors: [] });
const cards = [
  { name: "A", input: input("sacrifice a creature: scry 1.") },
  { name: "B", input: input("{t}: add {g}.") },
  { name: "C", input: input("sacrifice a creature: draw a card.") }
];
const rule = compileRule(
  { id: "sacrifice.outlet", theme: "sacrifice", provides: "gives", weight: 1, match: { text_any: ["sacrifice a creature:"] }, examples: { match: ["A"] } },
  {}
);

test("counts matches per rule and per tag, with samples", () => {
  const report = measureCoverage(cards, [rule]);
  assert.equal(report.cards, 3);
  assert.equal(report.tagged, 2);
  assert.deepEqual(report.rules[0], { ruleId: "sacrifice.outlet", tag: "theme:sacrifice/gives", matches: 2, samples: ["A", "C"] });
  assert.deepEqual(report.byTag, { "theme:sacrifice/gives": 2 });
});
