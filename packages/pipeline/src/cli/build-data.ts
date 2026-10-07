/**
 * `pnpm data:build` — turns data/raw/ into the browser artifacts in data/out/.
 * Run `pnpm data:fetch` first.
 *
 */
import { readYaml, repoPaths, type OverridesFile } from "@recom-tcg/rules-schema";
import { buildCardData, createManifest } from "../build/build-card-data.ts";
import { loadRules } from "../rules/load.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import { ArtifactStore } from "../storage/artifact-store.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const paths = repoPaths(import.meta.dirname);

const raw = new RawDataStore(paths.rawData).load();
const rules = loadRules(new YamlRuleSource(paths.rules));
const { overrides } = readYaml<OverridesFile>(paths.overrides);
const { version: modelVersion } = readYaml<{ version: string }>(paths.model);

const result = buildCardData({ rawCards: raw.oracleCards, commanderIds: new Set(raw.commanderIds), rules, overrides });
if (result.unknownOverrideCards.length > 0) {
  console.error(
    `✗ rules/overrides.yaml names cards that do not exist (use the English Oracle name): ${result.unknownOverrideCards.join(", ")}`
  );
  process.exit(1);
}

const manifest = createManifest(result, { updatedAt: raw.updatedAt, modelVersion, rulesCount: rules.length });
new ArtifactStore(paths.outData).save(result.cards, manifest);

console.log(
  `✓ ${manifest.cards} cards (${result.skipped} non-deck objects skipped) · ` +
    `${manifest.tagged} tagged · ${manifest.commanders} commanders · ${manifest.overrides} overrides`
);
