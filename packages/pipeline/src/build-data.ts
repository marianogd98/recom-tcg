/**
 * Builds the browser artifacts from data/raw/ (run `pnpm data:fetch` first):
 *   data/out/cards.json     every deck card with its theme and role tags
 *   data/out/manifest.json  data date + rules/model versions (RN-21)
 *
 * M1 will add: overrides, localized-name index (RN-11), embeddings and
 * percentiles (RN-26), and sharding by color identity.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readYaml, repoPaths } from "@recom-tcg/rules-schema";
import type { Card } from "@recom-tcg/engine";
import { loadRules } from "./rules/load.ts";
import { YamlRuleSource } from "./rules/rule-source.ts";
import { tagCard } from "./rules/apply.ts";
import { toEngineCard, toRuleInput } from "./normalize.ts";
import { NON_DECK_LAYOUTS, type ScryfallCard } from "./scryfall/types.ts";

const paths = repoPaths(import.meta.dirname);
const rawDir = paths.rawData;
const outDir = paths.outData;

const raw: ScryfallCard[] = JSON.parse(readFileSync(join(rawDir, "oracle-cards.json"), "utf8"));
const commanderIds = new Set<string>(JSON.parse(readFileSync(join(rawDir, "commanders.json"), "utf8")));
const meta = JSON.parse(readFileSync(join(rawDir, "meta.json"), "utf8")) as { updated_at: string };
const model = readYaml<{ version: string }>(paths.model);
const rules = loadRules(new YamlRuleSource(paths.rules));

const cards: Card[] = [];
let skipped = 0;
for (const sc of raw) {
  if (!sc.oracle_id || NON_DECK_LAYOUTS.has(sc.layout)) {
    skipped++;
    continue;
  }
  const tags = tagCard(toRuleInput(sc), rules);
  cards.push({ ...toEngineCard(sc, commanderIds), ...tags });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "cards.json"), JSON.stringify(cards));
const manifest = {
  dataDate: meta.updated_at.slice(0, 10),
  rulesVersion: `rules-${rules.length}`,
  modelVersion: model.version,
  cards: cards.length,
  commanders: cards.filter((c) => c.canBeCommander).length,
  tagged: cards.filter((c) => c.themes.length || c.roles.length).length
};
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`✓ ${manifest.cards} cards (${skipped} non-deck objects skipped) · ${manifest.tagged} tagged · ${manifest.commanders} commanders`);
