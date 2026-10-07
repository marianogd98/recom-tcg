/**
 * `pnpm rules:report [rule-id-prefix]` — how many cards each rule tags in
 * the real Commander pool, with sample names to check precision.
 * Needs `pnpm data:fetch` first. Example: `pnpm rules:report ramp.`
 */
import { isInCommanderPool } from "@recom-tcg/engine";
import { repoPaths } from "@recom-tcg/rules-schema";
import { isDeckCard } from "../build/build-card-data.ts";
import { toEngineCard, toRuleInput } from "../normalize.ts";
import { measureCoverage } from "../rules/coverage.ts";
import { loadRules } from "../rules/load.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const prefix = process.argv[2] ?? "";
const paths = repoPaths(import.meta.dirname);
const raw = new RawDataStore(paths.rawData).load();
const rules = loadRules(new YamlRuleSource(paths.rules)).filter((rule) => rule.def.id.startsWith(prefix));

const pool = raw.oracleCards
  .filter(isDeckCard)
  .filter((card) => isInCommanderPool(toEngineCard(card, new Set())))
  .map((card) => ({ name: card.name, input: toRuleInput(card) }));

const report = measureCoverage(pool, rules);

for (const rule of report.rules) {
  console.log(`${String(rule.matches).padStart(6)}  ${rule.ruleId.padEnd(40)} ${rule.tag}`);
  console.log(`        ${rule.samples.join(" · ")}`);
}
console.log("\nCards per tag:");
for (const [tag, count] of Object.entries(report.byTag)) console.log(`${String(count).padStart(6)}  ${tag}`);
const share = ((report.tagged / report.cards) * 100).toFixed(1);
console.log(`\n${report.tagged} of ${report.cards} cards in the Commander pool have at least one tag (${share}%).`);
