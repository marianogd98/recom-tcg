/**
 * Each semantic check is tested on its own, with documents built in memory.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { OverrideDefinition, RuleDefinition, Vocabulary } from "../index.ts";
import {
  captureGroupsPresent,
  compilablePatterns,
  knownVocabulary,
  overridesUseVocabulary,
  uniqueOverrideCards,
  uniqueRuleIds,
  type SemanticContext
} from "./semantic-checks.ts";

const vocabulary: Vocabulary = {
  schema_version: 1,
  themes: [
    { id: "sacrifice", description: "" },
    { id: "tribal", description: "", parameterized: true }
  ],
  roles: [{ id: "ramp" }],
  macros: { N: "(?:a|\\d+)" }
};

const rule = (overrides: Partial<RuleDefinition>): RuleDefinition => ({
  id: "sacrifice.test",
  theme: "sacrifice",
  provides: "gives",
  weight: 1,
  match: { text_any: ["sacrifice {N} creature"] },
  examples: { match: ["X"] },
  ...overrides
});

const context = (...rules: RuleDefinition[]): SemanticContext => ({
  vocabulary,
  ruleFiles: [{ file: "rules/themes/test.yaml", rules }],
  overrides: []
});

const withOverrides = (...overrides: OverrideDefinition[]): SemanticContext => ({ ...context(), overrides });
const override = (fields: Partial<OverrideDefinition>): OverrideDefinition => ({
  card: "Some Card",
  reason: "the rule misreads this card",
  ...fields
});

test("a clean rule passes every check", () => {
  const ctx = context(rule({}));
  for (const check of [uniqueRuleIds, knownVocabulary, compilablePatterns, captureGroupsPresent]) {
    assert.deepEqual(check.run(ctx), [], check.name);
  }
});

test("duplicate ids are reported once, pointing at the first file", () => {
  const problems = uniqueRuleIds.run(context(rule({}), rule({})));
  assert.equal(problems.length, 1);
  assert.match(problems[0]!.message, /duplicate rule id "sacrifice.test"/);
});

test("unknown themes and roles are reported", () => {
  const problems = knownVocabulary.run(context(rule({ theme: "nonsense" }), rule({ id: "x.y", theme: undefined, role: "flying" })));
  assert.equal(problems.length, 2);
});

test("unknown macros and broken regexes are reported", () => {
  const problems = compilablePatterns.run(context(rule({ match: { text_any: ["create {M} token", "unclosed ("] } })));
  assert.equal(problems.length, 2);
});

test("a capture needs its named group", () => {
  const problems = captureGroupsPresent.run(context(rule({ capture: "creature_type" })));
  assert.match(problems[0]!.message, /captures "creature_type"/);
});

test("a valid override passes", () => {
  const ctx = withOverrides(
    override({
      add: [
        { theme: "tribal:elf", provides: "asks", weight: 1 },
        { role: "ramp", weight: 0.5 }
      ],
      remove: ["sacrifice/gives", "tribal", "ramp"]
    })
  );
  assert.deepEqual(overridesUseVocabulary.run(ctx), []);
});

test("overrides cannot invent themes, roles or captured values", () => {
  const ctx = withOverrides(
    override({
      add: [
        { theme: "voltron", provides: "gives", weight: 1 },
        { theme: "sacrifice:food", provides: "gives", weight: 1 },
        { role: "teleport", weight: 1 }
      ],
      remove: ["nothing", "ramp/gives"]
    })
  );
  const messages = overridesUseVocabulary.run(ctx).map((problem) => problem.message);
  assert.equal(messages.length, 5);
  assert.match(messages[0]!, /unknown theme "voltron"/);
  assert.match(messages[1]!, /not parameterized/);
  assert.match(messages[2]!, /unknown role "teleport"/);
  assert.match(messages[3]!, /neither a theme nor a role/);
  assert.match(messages[4]!, /roles have no captured value/);
});

test("a card can have only one override", () => {
  const ctx = withOverrides(override({ remove: ["ramp"] }), override({ remove: ["sacrifice"] }));
  assert.equal(uniqueOverrideCards.run(ctx).length, 1);
});
