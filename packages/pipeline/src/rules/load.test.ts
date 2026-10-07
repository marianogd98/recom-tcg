import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "./load.ts";
import type { RuleSource } from "./rule-source.ts";

test("loadRules works with any RuleSource, not only YAML files", () => {
  // A plain object satisfies the interface: no files, no mocks library.
  const source: RuleSource = {
    macros: () => ({ N: "(?:a|\\d+)" }),
    definitions: () => [
      { id: "ramp.test", role: "ramp", weight: 1, match: { text_any: ["add {N} mana"] }, examples: { match: ["X"] } }
    ]
  };
  const [rule] = loadRules(source);
  assert.equal(rule?.def.id, "ramp.test");
  assert.equal(rule?.faceConditions.length, 1);
});
