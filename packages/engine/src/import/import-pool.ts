import type { Card, ImportLineResult, PoolEntry } from "../types.ts";
import { parseCsv } from "./csv.ts";
import type { ImportedLine } from "./imported-line.ts";
import type { NameResolver } from "./name-resolver.ts";
import { detectProfile, readCsvRows, type ImportProfile } from "./profiles.ts";
import { parseTextList } from "./text-list.ts";

export interface ImportContext {
  cards: readonly Pick<Card, "oracleId" | "legality">[];
  resolver: NameResolver;
  profiles: readonly ImportProfile[];
}

export interface ImportOptions {
  /** RN-19 "mesa casual": banned cards stay in the pool. Off by default. */
  casualTable?: boolean;
  /** Line number → oracle_id the user picked for an ambiguous line. */
  choices?: Readonly<Record<number, string>>;
}

/** How the input was read. "unknown-csv" is a table whose columns no profile knows. */
export type ImportFormat = { kind: "text" } | { kind: "csv"; profileId: string } | { kind: "unknown-csv"; header: string[] };

/** The numbers behind "312 líneas procesadas · 287 reconocidas · …" (RN-13). */
export interface ImportSummary {
  lines: number;
  recognized: number;
  corrected: number;
  ambiguous: number;
  unrecognized: number;
  /** Lines per kind of non-deck object: { token: 8, emblem: 1 }. */
  ignored: Record<string, number>;
  /** Distinct cards left out for legality. */
  excluded: { banned: number; notLegal: number };
  /** Distinct cards in the final pool. */
  poolCards: number;
}

export interface ImportResult {
  format: ImportFormat;
  /** One entry per card, quantities added up across printings (RN-10). */
  pool: PoolEntry[];
  /** Distinct banned cards kept out of the pool; the candidate search mentions banned commanders (RN-02). */
  banned: string[];
  lines: ImportLineResult[];
  summary: ImportSummary;
}

/**
 * Bloque 2 from start to end: reads a pasted list or a CSV export, resolves
 * every name, applies legality and returns the pool with a report where
 * every line has a status. Nothing is dropped silently (RN-13).
 *
 * Pure and synchronous: it runs in the browser, so the pool never leaves
 * the user's device (RN-20). An ambiguous line stays out of the pool until
 * the user picks a candidate; the UI then calls importPool again with
 * `choices`, which keeps this function free of state.
 */
export function importPool(input: string, context: ImportContext, options: ImportOptions = {}): ImportResult {
  const { format, lines: imported } = readInput(input, context.profiles);
  const legality = new Map(context.cards.map((card) => [card.oracleId, card.legality]));
  const lines = imported.map((line) => resolveLine(line, context.resolver, legality, options));

  const quantities = new Map<string, number>();
  for (const line of lines) {
    if (line.oracleId && !line.excluded && line.status !== "ambiguous") {
      quantities.set(line.oracleId, (quantities.get(line.oracleId) ?? 0) + line.quantity);
    }
  }
  const pool = [...quantities].map(([oracleId, quantity]) => ({ oracleId, quantity }));
  const banned = [...new Set(lines.filter((line) => line.excluded === "banned").map((line) => line.oracleId!))];
  return { format, pool, banned, lines, summary: summarize(lines, pool) };
}

function readInput(input: string, profiles: readonly ImportProfile[]): { format: ImportFormat; lines: ImportedLine[] } {
  const rows = parseCsv(input);
  const header = rows[0] ?? [];
  const profile = header.length > 1 ? detectProfile(header, profiles) : null;
  if (profile) return { format: { kind: "csv", profileId: profile.id }, lines: readCsvRows(rows, profile) };
  if (looksLikeTable(rows)) return { format: { kind: "unknown-csv", header }, lines: [] };
  return { format: { kind: "text" }, lines: parseTextList(input) };
}

/**
 * A table no profile knows: several columns, the same count on every row,
 * and a first row without numbers (a header). Reading it as a text list
 * would report every row as an unknown card; saying "unknown columns" is
 * more useful.
 */
function looksLikeTable(rows: readonly string[][]): boolean {
  const [header, ...body] = rows;
  if (!header || header.length < 3 || body.length === 0) return false;
  return header.every((cell) => !/^\d+$/.test(cell.trim())) && body.slice(0, 5).every((row) => row.length === header.length);
}

function resolveLine(
  line: ImportedLine,
  resolver: NameResolver,
  legality: ReadonlyMap<string, Card["legality"]>,
  options: ImportOptions
): ImportLineResult {
  const base = { line: line.line, raw: line.raw, name: line.name, quantity: line.quantity };
  const chosen = options.choices?.[line.line];
  const known = (id: string | undefined) => (id && legality.has(id) ? id : undefined);

  const direct = known(line.oracleId) ?? known(chosen);
  if (direct) return withLegality({ ...base, status: "recognized", oracleId: direct }, legality, options);

  const resolution = resolver.resolve(line.name);
  switch (resolution.status) {
    case "recognized":
    case "corrected":
      return withLegality({ ...base, status: resolution.status, oracleId: resolution.oracleId }, legality, options);
    case "ambiguous":
      return settleByLegality({ ...base, status: "ambiguous", suggestions: resolution.candidates }, legality, options);
    case "ignored":
      return { ...base, status: "ignored", ignoredKind: resolution.kind };
    case "unrecognized":
      return { ...base, status: "unrecognized" };
  }
}

/**
 * Some names belong to two cards: a real one and a playtest or "Un" card
 * that is not legal ("Red Herring", "Pick Your Poison"). Asking the user
 * which one they own would be absurd when only one could ever be in a
 * Commander deck, so:
 *
 * - exactly one candidate is playable → accepted and flagged ("corrected");
 * - none is playable → the answer would be "not legal" whichever it is, so
 *   the line is recognized and excluded without asking.
 *
 * Otherwise the user still chooses (RN-13: better to ask than to guess).
 */
function settleByLegality(
  line: ImportLineResult,
  legality: ReadonlyMap<string, Card["legality"]>,
  options: ImportOptions
): ImportLineResult {
  const candidates = line.suggestions ?? [];
  const playable = candidates.filter((id) => legality.has(id) && legality.get(id) !== "not_legal");
  const { suggestions: _, ...rest } = line;
  if (playable.length === 1) return withLegality({ ...rest, status: "corrected", oracleId: playable[0]! }, legality, options);
  if (playable.length === 0 && candidates.length > 0) return { ...rest, status: "recognized", oracleId: candidates[0]!, excluded: "not_legal" };
  return line;
}

/** RN-19: not-legal cards are always out; banned ones too, unless the table is casual. */
function withLegality(
  line: ImportLineResult,
  legality: ReadonlyMap<string, Card["legality"]>,
  options: ImportOptions
): ImportLineResult {
  const status = legality.get(line.oracleId!);
  if (status === "not_legal") return { ...line, excluded: "not_legal" };
  if (status === "banned" && !options.casualTable) return { ...line, excluded: "banned" };
  return line;
}

function summarize(lines: readonly ImportLineResult[], pool: readonly PoolEntry[]): ImportSummary {
  const count = (status: ImportLineResult["status"]) => lines.filter((line) => line.status === status).length;
  const distinctExcluded = (reason: ImportLineResult["excluded"]) =>
    new Set(lines.filter((line) => line.excluded === reason).map((line) => line.oracleId)).size;

  const ignored: Record<string, number> = {};
  for (const line of lines) if (line.ignoredKind) ignored[line.ignoredKind] = (ignored[line.ignoredKind] ?? 0) + 1;

  return {
    lines: lines.length,
    recognized: count("recognized"),
    corrected: count("corrected"),
    ambiguous: count("ambiguous"),
    unrecognized: count("unrecognized"),
    ignored,
    excluded: { banned: distinctExcluded("banned"), notLegal: distinctExcluded("not_legal") },
    poolCards: pool.length
  };
}
