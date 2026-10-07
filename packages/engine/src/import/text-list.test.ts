import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTextList } from "./text-list.ts";

const read = (text: string) => parseTextList(text).map(({ name, quantity }) => [quantity, name]);

test("quantity with or without x, and no quantity at all (RN-14)", () => {
  assert.deepEqual(read("4 Lightning Bolt\n1x Sol Ring\nCommand Tower"), [
    [4, "Lightning Bolt"],
    [1, "Sol Ring"],
    [1, "Command Tower"]
  ]);
});

test("edition and collector number are ignored (RN-10)", () => {
  assert.deepEqual(read("1 Sol Ring (CMR) 263\n1 Arcane Signet (M3C) 283★"), [
    [1, "Sol Ring"],
    [1, "Arcane Signet"]
  ]);
});

test("Moxfield and Archidekt decorations are removed", () => {
  assert.deepEqual(read("1 Sol Ring (CMR) 263 *F* #ramp\n1x Sol Ring (cmr) 263 [Ramp] ^Have,#37d67a^"), [
    [1, "Sol Ring"],
    [1, "Sol Ring"]
  ]);
});

test("double-faced and split names keep their slashes", () => {
  assert.deepEqual(read("1 Delver of Secrets // Insectile Aberration\n1 Fire // Ice"), [
    [1, "Delver of Secrets // Insectile Aberration"],
    [1, "Fire // Ice"]
  ]);
});

test("section headers, comments and blank lines are not cards", () => {
  const text = "Commander\n1 Kenrith, the Returned King\n\nCreatures (2)\n# my notes\n// Lands\nSIDEBOARD:\n2 Llanowar Elves";
  assert.deepEqual(read(text), [
    [1, "Kenrith, the Returned King"],
    [2, "Llanowar Elves"]
  ]);
});

test("each line keeps its number and raw text for the report (RN-13)", () => {
  const [line] = parseTextList("\n\n  3x Ponder (M12) 73  ");
  assert.equal(line?.line, 3);
  assert.equal(line?.raw, "  3x Ponder (M12) 73  ");
});

test("a name in parentheses that is not a set code survives", () => {
  assert.deepEqual(read("1 B.F.M. (Big Furry Monster)"), [[1, "B.F.M. (Big Furry Monster)"]]);
});
