/**
 * `pnpm data:fetch` — downloads the raw inputs into data/raw/.
 *
 * A CLI is only wiring: it builds the real dependencies, calls them in
 * order and prints progress. The logic lives in ScryfallClient and
 * RawDataStore, which are tested on their own.
 */
import { repoPaths } from "@recom-tcg/rules-schema";
import { ScryfallClient } from "../scryfall/client.ts";
import { localizedNames } from "../scryfall/localized-names.ts";
import { RawDataStore } from "../storage/raw-data-store.ts";

const USER_AGENT = "ReComTCG/0.1 (+https://github.com/marianogd98/recom-tcg)";

/**
 * Languages whose card lists the importer accepts (RN-11), as Scryfall
 * codes: es, fr, de, it, pt, ja, ko, ru, zhs, zht. Adding one is adding
 * its code here; each costs one paged search of a minute or two.
 */
const NAME_INDEX_LANGUAGES = ["es"];

async function main(): Promise<void> {
  const scryfall = new ScryfallClient({ userAgent: USER_AGENT });
  const store = new RawDataStore(repoPaths(import.meta.dirname).rawData);

  const bulk = await scryfall.oracleBulkFile();
  console.log(`Downloading oracle_cards (${bulk.format}, ${bulk.updatedAt})…`);
  store.saveOracleCards(await scryfall.download(bulk.downloadUri), bulk.format);

  console.log("Fetching is:commander…");
  const commanderIds = await scryfall.searchOracleIds("is:commander");
  store.saveCommanderIds(commanderIds);

  for (const lang of NAME_INDEX_LANGUAGES) {
    console.log(`Fetching every printing in "${lang}" (paged search, ~1–2 min)…`);
    const names = localizedNames(await scryfall.localizedPrintings(lang));
    store.saveLocalizedNames(lang, names);
    console.log(`  ${names.length} ${lang} names`);
  }

  store.saveMeta({ updatedAt: bulk.updatedAt, format: bulk.format });

  console.log(`✓ ${commanderIds.length} commander-eligible cards · data ${bulk.updatedAt}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
