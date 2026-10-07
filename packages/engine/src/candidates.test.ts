import { test } from "node:test";
import assert from "node:assert/strict";
import { eligiblePool, findCandidates, formPairs, soloCandidates } from "./candidates.ts";
import type { Card, PairingTag } from "./types.ts";

const card = (oracleId: string, colorIdentity: Card["colorIdentity"], fields: Partial<Card> = {}): Card => ({
  oracleId,
  name: oracleId,
  manaValue: 3,
  colorIdentity,
  typeLine: "Legendary Creature",
  keywords: [],
  legality: "legal",
  canBeCommander: true,
  copyLimit: 1,
  landValue: 0,
  themes: [],
  roles: [],
  ...fields
});
const partner: PairingTag[] = [
  { id: "partner", side: "a", key: "" },
  { id: "partner", side: "b", key: "" }
];

const cards = [
  card("meren", ["B", "G"]),
  card("kenrith", ["W", "U", "B", "R", "G"]),
  card("golos", []),
  card("thrasios", ["U", "G"], { pairing: partner }),
  card("tymna", ["W", "B"], { pairing: partner }),
  card("karlach", ["R"], { pairing: [{ id: "choose-a-background", side: "a", key: "" }] }),
  card("raised-by-giants", ["G"], { typeLine: "Legendary Enchantment — Background", pairing: [{ id: "choose-a-background", side: "b", key: "", solo: false }] }),
  card("regna", ["W"], { pairing: [{ id: "partner-with", side: "a", key: "krav" }, { id: "partner-with", side: "b", key: "regna" }] }),
  card("krav", ["B"], { pairing: [{ id: "partner-with", side: "a", key: "regna" }, { id: "partner-with", side: "b", key: "krav" }] }),
  card("braids", ["B"], { legality: "banned" }),
  card("sol-ring", [], { canBeCommander: false, typeLine: "Artifact" }),
  card("llanowar", ["G"], { canBeCommander: false, typeLine: "Creature — Elf" }),
  card("bolt", ["R"], { canBeCommander: false, typeLine: "Instant" })
];
const byId = new Map(cards.map((c) => [c.oracleId, c]));
const owned = cards.map(({ oracleId }) => ({ oracleId, quantity: 1 }));
const ids = (candidates: { commanderIds: string[] }[]) => candidates.map((c) => c.commanderIds.join("+")).sort();

test("legal commander-eligible cards are candidates; a Background alone is not (RN-01)", () => {
  assert.deepEqual(ids(soloCandidates(cards)), ["golos", "karlach", "kenrith", "krav", "meren", "regna", "thrasios", "tymna"]);
});

test("pairs form only within the same variant and key (RN-04)", () => {
  assert.deepEqual(ids(formPairs(cards)), ["karlach+raised-by-giants", "krav+regna", "thrasios+tymna"]);
});

test("a pair's identity is the union of both", () => {
  const pair = formPairs(cards).find((c) => c.pairingId === "partner")!;
  assert.deepEqual(pair.colorIdentity, ["W", "U", "B", "G"]);
});

test("exact identity by default; subsets on request; colorless only when chosen (RN-05, RN-06)", () => {
  assert.deepEqual(ids(findCandidates(owned, byId, { identities: ["BG"], includeSubsets: false }).candidates), ["meren"]);
  assert.deepEqual(ids(findCandidates(owned, byId, { identities: ["WB"], includeSubsets: true }).candidates), ["krav", "krav+regna", "regna", "tymna"]);
  assert.deepEqual(ids(findCandidates(owned, byId, { identities: [""], includeSubsets: false }).candidates), ["golos"]);
});

test("a commander that can pair is offered alone and in its pair (RN-07)", () => {
  const found = ids(findCandidates(owned, byId, { identities: ["RG"], includeSubsets: true }).candidates);
  assert.ok(found.includes("karlach"));
  assert.ok(found.includes("karlach+raised-by-giants"));
});

test("banned commanders that fit are reported, never offered (RN-02)", () => {
  const pool = owned.filter(({ oracleId }) => oracleId !== "braids");
  const search = findCandidates(pool, byId, { identities: ["B"], includeSubsets: false }, ["braids"]);
  assert.deepEqual(search.bannedCommanders, ["braids"]);
  assert.equal(ids(search.candidates).includes("braids"), false);
});

test("with 'mesa casual' the banned card is in the pool: still noted, still not a candidate", () => {
  const search = findCandidates(owned, byId, { identities: ["B"], includeSubsets: false });
  assert.deepEqual(search.bannedCommanders, ["braids"]);
  assert.equal(ids(search.candidates).includes("braids"), false);
});

test("no candidate: the nearest identities that have some (RN-59)", () => {
  const search = findCandidates(owned, byId, { identities: ["UR"], includeSubsets: false });
  assert.deepEqual(search.candidates, []);
  assert.deepEqual(search.nearestIdentities[0], { identity: "R", candidates: 1 });
});

test("E(c): pool cards inside the identity, without the commanders themselves (RN-03, RN-08)", () => {
  const meren = { commanderIds: ["meren"], colorIdentity: ["B", "G"] as Card["colorIdentity"] };
  const eligible = eligiblePool(meren, owned, byId).map((c) => c.oracleId).sort();
  // A green Background is a legal enchantment: Meren can play it among the 99.
  assert.deepEqual(eligible, ["braids", "golos", "krav", "llanowar", "raised-by-giants", "sol-ring"]);
});
