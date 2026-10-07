import { test } from "node:test";
import assert from "node:assert/strict";
import type { OverrideDefinition } from "@recom-tcg/rules-schema";
import { applyOverride, OVERRIDE_RULE_ID, type CardTags } from "./overrides.ts";

const tags: CardTags = {
  themes: [
    { theme: "counters", provides: "gives", weight: 1, ruleIds: ["counters.put"] },
    { theme: "counters", provides: "asks", weight: 0.8, ruleIds: ["counters.payoff"] },
    { theme: "tribal:elf", provides: "asks", weight: 1, ruleIds: ["tribal.lord"] }
  ],
  roles: [{ role: "ramp", weight: 1, ruleIds: ["ramp.mana-dork"] }]
};

const override = (fields: Partial<OverrideDefinition>): OverrideDefinition => ({ card: "X", reason: "a person read it", ...fields });

test("a bare theme removes both directions", () => {
  const result = applyOverride(tags, override({ remove: ["counters"] }));
  assert.deepEqual(result.themes.map((tag) => tag.theme), ["tribal:elf"]);
});

test("a direction removes only that direction", () => {
  const result = applyOverride(tags, override({ remove: ["counters/asks"] }));
  assert.deepEqual(result.themes.map((tag) => `${tag.theme}/${tag.provides}`), ["counters/gives", "tribal:elf/asks"]);
});

test("a parameterized family and roles can be removed", () => {
  const result = applyOverride(tags, override({ remove: ["tribal", "ramp"] }));
  assert.equal(result.themes.some((tag) => tag.theme.startsWith("tribal")), false);
  assert.deepEqual(result.roles, []);
});

test("an added tag replaces the rule's tag and says it came from an override", () => {
  const result = applyOverride(
    tags,
    override({
      add: [
        { theme: "counters", provides: "gives", weight: 0.3 },
        { role: "draw", weight: 0.5 }
      ]
    })
  );
  const counters = result.themes.filter((tag) => tag.theme === "counters" && tag.provides === "gives");
  assert.deepEqual(counters, [{ theme: "counters", provides: "gives", weight: 0.3, ruleIds: [OVERRIDE_RULE_ID] }]);
  assert.deepEqual(result.roles.map((tag) => tag.role), ["ramp", "draw"]);
});

test("removals run before additions, so a tag can be swapped for another", () => {
  const result = applyOverride(tags, override({ remove: ["counters"], add: [{ theme: "counters", provides: "asks", weight: 0.5 }] }));
  assert.deepEqual(result.themes.map((tag) => `${tag.theme}/${tag.provides}/${tag.weight}`), ["tribal:elf/asks/1", "counters/asks/0.5"]);
});

test("the input tags are left untouched", () => {
  const before = JSON.stringify(tags);
  applyOverride(tags, override({ remove: ["counters"], add: [{ role: "draw", weight: 1 }] }));
  assert.equal(JSON.stringify(tags), before);
});
