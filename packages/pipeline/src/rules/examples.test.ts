/**
 * Runs the `examples` of every rule in rules/ (gramática §3.1: autoverificable).
 * Cards come from fixtures/cards.json. When a rule cites a card that is not in
 * the fixtures yet, the test says so: add it with its exact Oracle text.
 *
 * In CI, the data workflow re-runs these examples against the full Scryfall dump.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoPaths } from "@recom-tcg/rules-schema";
import { loadRules } from "./load.ts";
import { matchRule } from "./match.ts";
import { toRuleInput } from "../normalize.ts";
import type { ScryfallCard } from "../scryfall/types.ts";

const paths = repoPaths(import.meta.dirname);
const fixtures: ScryfallCard[] = JSON.parse(readFileSync(join(paths.root, "packages/pipeline/fixtures/cards.json"), "utf8"));
const byName = new Map(fixtures.map((c) => [c.name, c]));

for (const rule of loadRules(paths.rules)) {
  test(`rule ${rule.def.id}`, () => {
    const check = (name: string, expected: boolean) => {
      const card = byName.get(name);
      assert.ok(card, `"${name}" is not in packages/pipeline/fixtures/cards.json — add it with its exact Oracle text`);
      const matched = matchRule(toRuleInput(card), rule) !== null;
      assert.equal(matched, expected, `${rule.def.id} should ${expected ? "" : "NOT "}match "${name}"`);
    };
    for (const name of rule.def.examples.match) check(name, true);
    for (const name of rule.def.examples.no_match ?? []) check(name, false);
  });
}
