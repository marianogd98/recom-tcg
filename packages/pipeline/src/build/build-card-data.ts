import type { Card } from "@recom-tcg/engine";
import { tagCard } from "../rules/apply.ts";
import type { CompiledRule } from "../rules/compile.ts";
import { toEngineCard, toRuleInput } from "../normalize.ts";
import { NON_DECK_LAYOUTS, type ScryfallCard } from "../scryfall/types.ts";

export interface BuildInput {
  rawCards: ScryfallCard[];
  commanderIds: ReadonlySet<string>;
  rules: CompiledRule[];
}

export interface BuildResult {
  cards: Card[];
  /** Tokens, emblems and other objects that are not deck cards (RN-18). */
  skipped: number;
}

/** Stamped next to the data so every result says which data produced it (RN-21). */
export interface Manifest {
  dataDate: string;
  modelVersion: string;
  rulesCount: number;
  cards: number;
  commanders: number;
  tagged: number;
}

/**
 * The data build as a pure function: same input, same output, no files.
 * The CLI (cli/build-data.ts) only reads inputs and writes outputs around it.
 */
export function buildCardData({ rawCards, commanderIds, rules }: BuildInput): BuildResult {
  const deckCards = rawCards.filter(isDeckCard);
  const cards = deckCards.map((raw) => ({
    ...toEngineCard(raw, commanderIds),
    ...tagCard(toRuleInput(raw), rules)
  }));
  return { cards, skipped: rawCards.length - deckCards.length };
}

export function isDeckCard(card: ScryfallCard): boolean {
  return Boolean(card.oracle_id) && !NON_DECK_LAYOUTS.has(card.layout);
}

export function createManifest(
  { cards }: BuildResult,
  versions: { updatedAt: string; modelVersion: string; rulesCount: number }
): Manifest {
  return {
    dataDate: versions.updatedAt.slice(0, 10),
    modelVersion: versions.modelVersion,
    rulesCount: versions.rulesCount,
    cards: cards.length,
    commanders: cards.filter((card) => card.canBeCommander).length,
    tagged: cards.filter((card) => card.themes.length > 0 || card.roles.length > 0).length
  };
}
