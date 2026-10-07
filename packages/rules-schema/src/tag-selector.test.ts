import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTagSelector, selectsRole, selectsTheme } from "./tag-selector.ts";

test("parses the four forms of a remove entry", () => {
  assert.deepEqual(parseTagSelector("counters"), { base: "counters" });
  assert.deepEqual(parseTagSelector("counters/gives"), { base: "counters", provides: "gives" });
  assert.deepEqual(parseTagSelector("tribal"), { base: "tribal" });
  assert.deepEqual(parseTagSelector("tribal:elf/asks"), { base: "tribal", param: "elf", provides: "asks" });
});

test("a bare theme selects both directions; a direction narrows it", () => {
  assert.equal(selectsTheme(parseTagSelector("counters"), "counters", "asks"), true);
  assert.equal(selectsTheme(parseTagSelector("counters"), "counters", "gives"), true);
  assert.equal(selectsTheme(parseTagSelector("counters/gives"), "counters", "asks"), false);
});

test("a parameterized theme is selected as a family or one value at a time", () => {
  assert.equal(selectsTheme(parseTagSelector("tribal"), "tribal:elf", "asks"), true);
  assert.equal(selectsTheme(parseTagSelector("tribal:elf"), "tribal:elf", "asks"), true);
  assert.equal(selectsTheme(parseTagSelector("tribal:elf"), "tribal:zombie", "asks"), false);
});

test("a selector never reaches a theme whose id only starts the same way", () => {
  assert.equal(selectsTheme(parseTagSelector("token"), "tokens", "gives"), false);
});

test("roles are selected by their bare id only", () => {
  assert.equal(selectsRole(parseTagSelector("ramp"), "ramp"), true);
  assert.equal(selectsRole(parseTagSelector("ramp/gives"), "ramp"), false);
});
