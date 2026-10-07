import { test } from "node:test";
import assert from "node:assert/strict";
import { countOverridesByTag } from "./override-stats.ts";

test("counts each card once per theme or role it touches", () => {
  const counts = countOverridesByTag([
    { card: "A", reason: "xxxxxxxxxx", remove: ["counters/gives", "counters/asks"] },
    { card: "B", reason: "xxxxxxxxxx", add: [{ theme: "tribal:elf", provides: "asks", weight: 1 }], remove: ["ramp"] },
    { card: "C", reason: "xxxxxxxxxx", remove: ["counters"] }
  ]);
  assert.deepEqual(counts, { counters: 2, ramp: 1, tribal: 1 });
});
