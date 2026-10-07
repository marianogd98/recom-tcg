/**
 * Downloads the raw inputs of the data build into data/raw/:
 *   - oracle-cards.json  one entry per card (Scryfall bulk "oracle_cards")
 *   - commanders.json    oracle ids returned by the search is:commander (RN-01)
 *   - meta.json          the bulk file's updated_at (RN-21)
 *
 * Scryfall asks API clients to send a User-Agent and an Accept header and to keep
 * 50–100 ms between requests: https://scryfall.com/docs/api
 * Bulk files are served from a CDN and are not rate limited.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, "../../../../data/raw");
const API = "https://api.scryfall.com";
const HEADERS = {
  // Replace <owner> once the repository is public.
  "User-Agent": "ReComTCG/0.1 (+https://github.com/marianogd98/recom-tcg)",
  Accept: "application/json;q=0.9,*/*;q=0.8"
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

interface BulkList {
  data: { type: string; download_uri: string; updated_at: string }[];
}

interface SearchPage {
  data: { oracle_id?: string }[];
  has_more: boolean;
  next_page?: string;
}

async function main(): Promise<void> {
  mkdirSync(rawDir, { recursive: true });

  const bulk = await getJson<BulkList>(`${API}/bulk-data`);
  const oracle = bulk.data.find((b) => b.type === "oracle_cards");
  if (!oracle) throw new Error("Scryfall bulk-data has no oracle_cards entry");
  console.log(`Downloading oracle_cards (${oracle.updated_at})…`);
  const res = await fetch(oracle.download_uri, { headers: HEADERS });
  if (!res.ok) throw new Error(`Bulk download failed: ${res.status}`);
  writeFileSync(join(rawDir, "oracle-cards.json"), Buffer.from(await res.arrayBuffer()));

  console.log("Fetching is:commander…");
  const ids = new Set<string>();
  let url: string | undefined = `${API}/cards/search?q=${encodeURIComponent("is:commander")}&unique=cards`;
  while (url) {
    await sleep(100);
    const page: SearchPage = await getJson<SearchPage>(url);
    for (const card of page.data) if (card.oracle_id) ids.add(card.oracle_id);
    url = page.has_more ? page.next_page : undefined;
  }

  writeFileSync(join(rawDir, "commanders.json"), JSON.stringify([...ids].sort()));
  writeFileSync(join(rawDir, "meta.json"), JSON.stringify({ updated_at: oracle.updated_at }, null, 2));
  console.log(`✓ ${ids.size} commander-eligible cards · data ${oracle.updated_at}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
