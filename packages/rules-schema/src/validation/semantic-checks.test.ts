/**
 * Each semantic check is tested on its own, with documents built in memory.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { RuleDefinition, Vocabulary } from "../index.ts";
import {
  captureGroupsPresent,
  compilablePatterns,
  knownVocabulary,
  uniqueRuleIds,
  type SemanticContext
} from "./semantic-checks.ts";

const vocabulary: Vocabulary = {
  schema_version: 1,
  themes: [{ id: "sacrifice", description: "" }],
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
  ruleFiles: [{ file: "rules/themes/test.yaml", rules }]
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
