import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoPaths } from "@recom-tcg/rules-schema";
import { loadRules } from "./load.ts";
import { YamlRuleSource } from "./rule-source.ts";
import { tagCard } from "./apply.ts";
import { toRuleInput } from "../normalize.ts";
import type { ScryfallCard } from "../scryfall/types.ts";

const paths = repoPaths(import.meta.dirname);
const rules = loadRules(new YamlRuleSource(paths.rules));
const fixtures: ScryfallCard[] = JSON.parse(readFileSync(join(paths.root, "packages/pipeline/fixtures/cards.json"), "utf8"));
const card = (name: string) => fixtures.find((c) => c.name === name)!;

test("captured themes become parameterized tags (tribal:elf)", () => {
  const { themes } = tagCard(toRuleInput(card("Elvish Archdruid")), rules);
  assert.deepEqual(themes.map((t) => `${t.theme}/${t.provides}`), ["tribal:elf/asks"]);
});

test("a card can carry a theme and a role at once", () => {
  const { themes, roles } = tagCard(toRuleInput(card("Viscera Seer")), rules);
  assert.equal(themes[0]?.theme, "sacrifice");
  assert.equal(themes[0]?.provides, "gives");
  assert.deepEqual(roles, []);
});

test("roles record which rule produced them (RN-58)", () => {
  const { roles } = tagCard(toRuleInput(card("Sakura-Tribe Elder")), rules);
  assert.deepEqual(roles.map((r) => r.ruleIds[0]), ["ramp.land-search"]);
});
