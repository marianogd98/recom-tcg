/**
 * `pnpm fixtures:sync` — copies every card named in a rule's `examples`
 * from the downloaded Scryfall data into fixtures/cards.json, with its exact
 * Oracle text. Contributors no longer copy texts by hand, and CI can check
 * the examples offline. Needs `pnpm data:fetch` first.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoPaths } from "@recom-tcg/rules-schema";
import { isDeckCard } from "../build/build-card-data.ts";
import { YamlRuleSource } from "../rules/rule-source.ts";
import { toFixture } from "../scryfall/fixture.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const paths = repoPaths(import.meta.dirname);
const names = new Set(
  new YamlRuleSource(paths.rules).definitions().flatMap((rule) => [...rule.examples.match, ...(rule.examples.no_match ?? [])])
);

// Tokens can share a name with a real card (there is a "Llanowar Elves" token):
// deck cards are indexed last so they win.
const cards = new RawDataStore(paths.rawData).load().oracleCards;
const byName = new Map([...cards.filter((card) => !isDeckCard(card)), ...cards.filter(isDeckCard)].map((card) => [card.name, card]));
const missing = [...names].filter((name) => !byName.has(name));
if (missing.length > 0) {
  console.error(`✗ Not found in the Scryfall data (check the spelling): ${missing.join(", ")}`);
  process.exit(1);
}

const fixtures = [...names].sort().map((name) => toFixture(byName.get(name)!));
writeFileSync(join(paths.root, "packages/pipeline/fixtures/cards.json"), JSON.stringify(fixtures, null, 2) + "\n");
console.log(`✓ ${fixtures.length} example cards written to packages/pipeline/fixtures/cards.json`);
