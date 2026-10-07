/**
 * Shared by the pool:* scripts: imports a local file with the same engine
 * code and data/out/ files the browser will use. Reads only; nothing leaves
 * the machine (RN-20).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importPool, NameResolver, type Card, type ImportResult } from "@recom-tcg/engine";
import { repoPaths } from "@recom-tcg/rules-schema";
import { ArtifactStore } from "../storage/artifact-store.ts";

interface ImportSettings {
  import: { fuzzy_max_distance: number; fuzzy_max_ratio: number; max_suggestions: number };
}

export interface LocalPool {
  result: ImportResult;
  cards: Map<string, Card>;
  elapsedMs: number;
}

/** `file` is relative to where the user typed the command: pnpm runs scripts inside packages/pipeline. */
export function importLocalPool(file: string, options: { casualTable?: boolean } = {}): LocalPool {
  const path = resolve(process.env["INIT_CWD"] ?? process.cwd(), file);
  const support = new ArtifactStore(repoPaths(import.meta.dirname).outData).loadImportSupport();
  const settings = (support.model as ImportSettings).import;

  const resolver = new NameResolver(
    { cards: support.cards, localized: support.localized, nonDeck: support.nonDeckNames },
    { maxDistance: settings.fuzzy_max_distance, maxRatio: settings.fuzzy_max_ratio, maxSuggestions: settings.max_suggestions }
  );

  const started = performance.now();
  const result = importPool(readFileSync(path, "utf8"), { cards: support.cards, resolver, profiles: support.profiles }, options);
  return {
    result,
    cards: new Map(support.cards.map((card) => [card.oracleId, card])),
    elapsedMs: Math.round(performance.now() - started)
  };
}

/** Exits with a usage line when the file argument is missing. */
export function fileArgument(usage: string): string {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
  return file;
}

/** The value after a flag: `--identity BG` → "BG". */
export function flagValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}
