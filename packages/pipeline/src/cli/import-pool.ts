/**
 * `pnpm pool:import <file> [--casual]` — imports a collection export or a
 * text list with the same engine code the browser will run, and prints the
 * import report (RN-13). For trying real exports before the web exists.
 *
 * Reads only data/out/ (run `pnpm data:build` first) and the given file.
 * Nothing is written or sent anywhere: the pool stays on your machine (RN-20).
 */
import type { ImportLineResult } from "@recom-tcg/engine";
import { fileArgument, importLocalPool } from "./local-pool.ts";

const file = fileArgument("pnpm pool:import <file.csv|file.txt> [--casual]");
const { result, cards, elapsedMs } = importLocalPool(file, { casualTable: process.argv.includes("--casual") });
const nameOf = (id: string | undefined) => (id ? cards.get(id)?.name : undefined);
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
    ` · pool: ${s.poolCards} distinct cards (${elapsedMs} ms)`
);

const show = (title: string, lines: ImportLineResult[], describe: (line: ImportLineResult) => string) => {
  if (lines.length === 0) return;
  console.log(`\n${title} (${lines.length}):`);
  for (const line of lines.slice(0, 25)) console.log(`  line ${String(line.line).padStart(4)}  ${describe(line)}`);
  if (lines.length > 25) console.log(`  … and ${lines.length - 25} more`);
};
const by = (status: ImportLineResult["status"]) => result.lines.filter((line) => line.status === status);

show("Corrected", by("corrected"), (line) => `"${line.name}" → ${nameOf(line.oracleId)}`);
show("Ambiguous", by("ambiguous"), (line) => `"${line.name}" → ${(line.suggestions ?? []).map(nameOf).join(" | ")}`);
show("Unrecognized", by("unrecognized"), (line) => `"${line.name}"`);
show("Not legal in Commander", result.lines.filter((line) => line.excluded), (line) => `${nameOf(line.oracleId)} (${line.excluded})`);
