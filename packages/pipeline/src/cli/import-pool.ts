/**
 * `pnpm pool:import <file> [--casual]` — imports a collection export or a
 * text list with the same engine code the browser will run, and prints the
 * import report (RN-13). For trying real exports before the web exists.
 *
 * Reads only data/out/ (run `pnpm data:build` first) and the given file.
 * Nothing is written or sent anywhere: the pool stays on your machine (RN-20).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importPool, NameResolver, type Card, type ImportLineResult } from "@recom-tcg/engine";
import { repoPaths } from "@recom-tcg/rules-schema";
import { ArtifactStore } from "../storage/artifact-store.ts";

interface ImportSettings {
  import: { fuzzy_max_distance: number; fuzzy_max_ratio: number; max_suggestions: number };
}

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Usage: pnpm pool:import <file.csv|file.txt> [--casual]");
  process.exit(1);
}

// pnpm runs the script inside packages/pipeline; INIT_CWD is where the user typed the command.
const path = resolve(process.env["INIT_CWD"] ?? process.cwd(), file);
const support = new ArtifactStore(repoPaths(import.meta.dirname).outData).loadImportSupport();
const settings = (support.model as ImportSettings).import;

const resolver = new NameResolver(
  { cards: support.cards, localized: support.localized, nonDeck: support.nonDeckNames },
  { maxDistance: settings.fuzzy_max_distance, maxRatio: settings.fuzzy_max_ratio, maxSuggestions: settings.max_suggestions }
);

const started = performance.now();
const result = importPool(readFileSync(path, "utf8"), { cards: support.cards, resolver, profiles: support.profiles }, { casualTable: args.includes("--casual") });
const elapsed = Math.round(performance.now() - started);

const nameOf = new Map(support.cards.map((card: Card) => [card.oracleId, card.name]));
const { summary: s, format } = result;

console.log(`Format: ${format.kind === "csv" ? `CSV (${format.profileId})` : format.kind}`);
if (format.kind === "unknown-csv") {
  console.log(`✗ No import profile knows these columns: ${format.header.join(", ")}`);
  console.log("  Add one under import-profiles/ (see generic-csv.yaml).");
  process.exit(1);
}

const ignored = Object.entries(s.ignored).map(([kind, count]) => `${count} ${kind}`);
console.log(
  `${s.lines} card lines · ${s.recognized} recognized · ${s.corrected} corrected (check) · ${s.ambiguous} ambiguous · ` +
    `${s.unrecognized} unrecognized` +
    (ignored.length ? ` · ignored: ${ignored.join(", ")}` : "") +
    ` · not legal: ${s.excluded.banned} banned, ${s.excluded.notLegal} other` +
    ` · pool: ${s.poolCards} distinct cards (${elapsed} ms)`
);

const show = (title: string, lines: ImportLineResult[], describe: (line: ImportLineResult) => string) => {
  if (lines.length === 0) return;
  console.log(`\n${title} (${lines.length}):`);
  for (const line of lines.slice(0, 25)) console.log(`  line ${String(line.line).padStart(4)}  ${describe(line)}`);
  if (lines.length > 25) console.log(`  … and ${lines.length - 25} more`);
};
const by = (status: ImportLineResult["status"]) => result.lines.filter((line) => line.status === status);

show("Corrected", by("corrected"), (line) => `"${line.name}" → ${nameOf.get(line.oracleId!)}`);
show("Ambiguous", by("ambiguous"), (line) => `"${line.name}" → ${(line.suggestions ?? []).map((id) => nameOf.get(id)).join(" | ")}`);
show("Unrecognized", by("unrecognized"), (line) => `"${line.name}"`);
show("Not legal in Commander", result.lines.filter((line) => line.excluded), (line) => `${nameOf.get(line.oracleId!)} (${line.excluded})`);
