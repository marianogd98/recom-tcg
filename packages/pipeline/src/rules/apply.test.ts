import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules } from "./load.ts";
import { tagCard } from "./apply.ts";
import { toRuleInput } from "../normalize.ts";
import type { ScryfallCard } from "../scryfall/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const rules = loadRules(resolve(here, "../../../../rules"));
const fixtures: ScryfallCard[] = JSON.parse(readFileSync(resolve(here, "../../fixtures/cards.json"), "utf8"));
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
