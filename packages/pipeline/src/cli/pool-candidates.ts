/**
 * `pnpm pool:candidates <file> [--identity BG,WBG] [--subsets] [--casual]`
 * Imports a local pool and lists who could command it (bloque 1), with the
 * size of each candidate's eligible pool E(c). Without --identity it lists
 * every identity that has candidates.
 *
 * There are no scores yet: this checks eligibility and pairs, not quality.
 */
import { eligiblePool, findCandidates, identityKey, IDENTITY_NAMES, type Candidate } from "@recom-tcg/engine";
import { fileArgument, flagValue, importLocalPool } from "./local-pool.ts";

const file = fileArgument("pnpm pool:candidates <file> [--identity BG,WBG] [--subsets] [--casual]");
const { result, cards } = importLocalPool(file, { casualTable: process.argv.includes("--casual") });

const chosen = flagValue("--identity")?.toUpperCase().split(",");
const everyIdentity = Object.keys(IDENTITY_NAMES);
const selection = { identities: chosen ?? everyIdentity, includeSubsets: process.argv.includes("--subsets") };
const search = findCandidates(result.pool, cards, selection, result.banned);

const nameOf = (id: string) => cards.get(id)?.name ?? id;
const label = (key: string) => `${key || "C"} (${IDENTITY_NAMES[key] ?? "?"})`;
const describe = (candidate: Candidate) => {
  const names = candidate.commanderIds.map(nameOf).join(" + ");
  const pair = candidate.pairingId ? `  [${candidate.pairingId}]` : "";
  return `${names}${pair} · ${eligiblePool(candidate, result.pool, cards).length} eligible cards`;
};

console.log(`Pool: ${result.summary.poolCards} cards · ${search.candidates.length} candidates`);

const byIdentity = new Map<string, Candidate[]>();
for (const candidate of search.candidates) {
  const key = identityKey(candidate.colorIdentity);
  byIdentity.set(key, [...(byIdentity.get(key) ?? []), candidate]);
}
for (const [key, candidates] of [...byIdentity].sort(([a], [b]) => a.length - b.length || a.localeCompare(b))) {
  console.log(`\n${label(key)}`);
  for (const candidate of candidates) console.log(`  ${describe(candidate)}`);
}

if (search.bannedCommanders.length > 0) {
  console.log(`\nBanned commanders you own (RN-02): ${search.bannedCommanders.map(nameOf).join(", ")}`);
}
if (search.candidates.length === 0) {
  console.log("\nNo candidates in that identity (RN-59). Closest identities with candidates:");
  for (const { identity, candidates } of search.nearestIdentities) console.log(`  ${label(identity)}: ${candidates}`);
}
