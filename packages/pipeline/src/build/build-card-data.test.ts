import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoPaths } from "@recom-tcg/rules-schema";
import { loadRules } from "../rules/load.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import type { ScryfallCard } from "../scryfall/types.ts";
import { buildCardData, createManifest } from "./build-card-data.ts";

const paths = repoPaths(import.meta.dirname);
const fixtures: ScryfallCard[] = JSON.parse(readFileSync(join(paths.root, "packages/pipeline/fixtures/cards.json"), "utf8"));
const rules = loadRules(new YamlRuleSource(paths.rules));
const token: ScryfallCard = {
  oracle_id: "fixture-token",
  name: "Elf Warrior",
  layout: "token",
  color_identity: ["G"],
  legalities: {}
};

test("skips objects that are not deck cards (RN-18)", () => {
  const memorabilia: ScryfallCard = { ...token, oracle_id: "fixture-front", layout: "front_card" };
  const result = buildCardData({ rawCards: [...fixtures, token, memorabilia], commanderIds: new Set(), rules });
  assert.equal(result.cards.length, fixtures.length);
  assert.equal(result.skipped, 2);
});

test("marks commander-eligible cards from the is:commander list (RN-01)", () => {
  const result = buildCardData({ rawCards: fixtures, commanderIds: new Set(["fixture-elvish-archdruid"]), rules });
  const eligible = result.cards.filter((card) => card.canBeCommander).map((card) => card.name);
  assert.deepEqual(eligible, ["Elvish Archdruid"]);
});

test("the manifest summarizes the build (RN-21)", () => {
  const result = buildCardData({ rawCards: fixtures, commanderIds: new Set(), rules });
  const manifest = createManifest(result, { updatedAt: "2026-10-01T09:00:00Z", modelVersion: "0.1.0", rulesCount: rules.length });
  assert.equal(manifest.dataDate, "2026-10-01");
  assert.equal(manifest.cards, fixtures.length);
  assert.ok(manifest.tagged > 0);
});
