/**
 * `pnpm data:build` — turns data/raw/ into the browser artifacts in data/out/.
 * Run `pnpm data:fetch` first.
 */
import { readYaml, repoPaths, type OverridesFile, type PairingFile } from "@recom-tcg/rules-schema";
import { buildCardData, createManifest } from "../build/build-card-data.ts";
import { buildNameIndex } from "../build/build-name-index.ts";
import { buildNonDeckNames } from "../build/build-non-deck-names.ts";
import { loadImportProfiles } from "../import-profiles.ts";
import { loadRules } from "../rules/load.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import { ArtifactStore } from "../storage/artifact-store.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const paths = repoPaths(import.meta.dirname);

const raw = new RawDataStore(paths.rawData).load();
const rules = loadRules(new YamlRuleSource(paths.rules));
const { overrides } = readYaml<OverridesFile>(paths.overrides);
const { pairings } = readYaml<PairingFile>(paths.pairing);
const model = readYaml<{ version: string }>(paths.model);
const modelVersion = model.version;

const result = buildCardData({ rawCards: raw.oracleCards, commanderIds: new Set(raw.commanderIds), rules, overrides, pairings });
if (result.unknownOverrideCards.length > 0) {
  console.error(
    `✗ rules/overrides.yaml names cards that do not exist (use the English Oracle name): ${result.unknownOverrideCards.join(", ")}`
  );
  process.exit(1);
}

const store = new ArtifactStore(paths.outData);
const localizedNames: Record<string, number> = {};
for (const [lang, names] of Object.entries(raw.localizedNames)) {
  const index = buildNameIndex(names, result.cards);
  store.saveNameIndex(lang, index);
  localizedNames[lang] = Object.keys(index).length;
}
const nonDeckNames = buildNonDeckNames(raw.oracleCards);
store.saveImportSupport(nonDeckNames, loadImportProfiles(paths.importProfiles), model);

const manifest = createManifest(result, { updatedAt: raw.updatedAt, modelVersion, rulesCount: rules.length, localizedNames });
store.save(result.cards, manifest);

console.log(
  `✓ ${manifest.cards} cards (${result.skipped} non-deck objects skipped) · ` +
    `${manifest.tagged} tagged · ${manifest.commanders} commanders · ${manifest.overrides} overrides`
);
for (const [lang, count] of Object.entries(localizedNames)) console.log(`✓ names.${lang}.json: ${count} localized names`);
if (Object.keys(localizedNames).length === 0) console.log('ℹ No localized names in data/raw. Run "pnpm data:fetch" again to build names.es.json.');
