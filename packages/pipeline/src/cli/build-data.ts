/**
 * `pnpm data:build` — turns data/raw/ into the browser artifacts in data/out/.
 * Run `pnpm data:fetch` first.
 *
 * M1 will add: overrides, localized-name index (RN-11), embeddings and
 * percentiles (RN-26), and sharding by color identity.
 */
import { readYaml, repoPaths } from "@recom-tcg/rules-schema";
import { buildCardData, createManifest } from "../build/build-card-data.ts";
import { loadRules } from "../rules/load.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import { ArtifactStore } from "../storage/artifact-store.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const paths = repoPaths(import.meta.dirname);

const raw = new RawDataStore(paths.rawData).load();
const rules = loadRules(new YamlRuleSource(paths.rules));
const { version: modelVersion } = readYaml<{ version: string }>(paths.model);

const result = buildCardData({ rawCards: raw.oracleCards, commanderIds: new Set(raw.commanderIds), rules });
const manifest = createManifest(result, { updatedAt: raw.updatedAt, modelVersion, rulesCount: rules.length });
new ArtifactStore(paths.outData).save(result.cards, manifest);

console.log(
  `✓ ${manifest.cards} cards (${result.skipped} non-deck objects skipped) · ` +
    `${manifest.tagged} tagged · ${manifest.commanders} commanders`
);
