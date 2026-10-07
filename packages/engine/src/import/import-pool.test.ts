import { test } from "node:test";
import assert from "node:assert/strict";
import { importPool, type ImportContext } from "./import-pool.ts";
import { NameResolver } from "./name-resolver.ts";
import type { ImportProfile } from "./profiles.ts";

const cards = [
  { oracleId: "bolt", name: "Lightning Bolt", legality: "legal" as const },
  { oracleId: "elves", name: "Llanowar Elves", legality: "legal" as const },
  { oracleId: "lotus", name: "Black Lotus", legality: "banned" as const },
  { oracleId: "squirrel", name: "Squirrel Farm", legality: "not_legal" as const },
  { oracleId: "mox-a", name: "Mox Ruby", legality: "legal" as const },
  { oracleId: "mox-b", name: "Mox Rubi", legality: "legal" as const },
  { oracleId: "herring-real", name: "Red Herring", legality: "legal" as const },
  { oracleId: "herring-playtest", name: "Red Herring", legality: "not_legal" as const },
  { oracleId: "gizmo-1", name: "Everythingamajig", legality: "not_legal" as const },
  { oracleId: "gizmo-2", name: "Everythingamajig", legality: "not_legal" as const }
];

const profiles: ImportProfile[] = [
  { id: "moxfield", detect: { header_contains: ["Count", "Tradelist Count", "Name"] }, columns: { name: "Name", quantity: "Count" } }
];

const context: ImportContext = {
  cards,
  profiles,
  resolver: new NameResolver(
    { cards, localized: [{ "elfos de llanowar": ["elves"] }], nonDeck: { treasure: "token" } },
    { maxDistance: 2, maxRatio: 0.25, maxSuggestions: 5 }
  )
};

test("a text list: every line gets a status and the pool merges printings (RN-10, RN-13)", () => {
  const result = importPool("2 Lightning Bolt (M10) 146\n1 Lightning Bolt (2X2) 117\n3 Elfos de Llanowar\n1 Treasure\n1 Lightinng Bolt", context);
  assert.deepEqual(result.format, { kind: "text" });
  assert.deepEqual(result.pool, [
    { oracleId: "bolt", quantity: 4 },
    { oracleId: "elves", quantity: 3 }
  ]);
  assert.deepEqual(result.lines.map((line) => line.status), ["recognized", "recognized", "recognized", "ignored", "corrected"]);
  assert.deepEqual(result.summary.ignored, { token: 1 });
  assert.equal(result.summary.poolCards, 2);
});

test("not-legal cards are always out; banned ones unless the table is casual (RN-19)", () => {
  const strict = importPool("Black Lotus\nSquirrel Farm\nLightning Bolt", context);
  assert.deepEqual(strict.pool.map((entry) => entry.oracleId), ["bolt"]);
  assert.deepEqual(strict.summary.excluded, { banned: 1, notLegal: 1 });

  const casual = importPool("Black Lotus\nSquirrel Farm", context, { casualTable: true });
  assert.deepEqual(casual.pool.map((entry) => entry.oracleId), ["lotus"]);
});

test("an ambiguous line waits for the user's choice", () => {
  const first = importPool("Mox Rubu", context);
  assert.equal(first.lines[0]?.status, "ambiguous");
  assert.deepEqual(first.lines[0]?.suggestions, ["mox-a", "mox-b"]);
  assert.deepEqual(first.pool, []);

  const chosen = importPool("Mox Rubu", context, { choices: { 1: "mox-b" } });
  assert.deepEqual(chosen.pool, [{ oracleId: "mox-b", quantity: 1 }]);
});

test("a name shared with a playtest card goes to the one playable card, flagged", () => {
  const result = importPool("Red Herring", context);
  assert.equal(result.lines[0]?.status, "corrected");
  assert.deepEqual(result.pool, [{ oracleId: "herring-real", quantity: 1 }]);
});

test("when no candidate is playable there is nothing to ask: the line is not legal", () => {
  const result = importPool("Everythingamajig", context);
  assert.equal(result.lines[0]?.status, "recognized");
  assert.equal(result.lines[0]?.excluded, "not_legal");
  assert.equal(result.summary.excluded.notLegal, 1);
});

test("a CSV export is read with the profile its header matches", () => {
  const result = importPool('Count,Tradelist Count,Name\n4,0,Lightning Bolt\n1,0,"Llanowar Elves"', context);
  assert.deepEqual(result.format, { kind: "csv", profileId: "moxfield" });
  assert.equal(result.summary.poolCards, 2);
});

test("a table with unknown columns is reported, not read as card names", () => {
  const result = importPool("Carta;Cantidad;Edición\nRayo;4;M10\nElfos;1;M19", context);
  assert.deepEqual(result.format, { kind: "unknown-csv", header: ["Carta", "Cantidad", "Edición"] });
  assert.deepEqual(result.lines, []);
});

test("a text list whose first card has a comma is still a text list", () => {
  const result = importPool("1 Kenrith, the Returned King\n4 Lightning Bolt", context);
  assert.deepEqual(result.format, { kind: "text" });
  assert.equal(result.lines[0]?.status, "unrecognized");
  assert.equal(result.lines[1]?.status, "recognized");
});
