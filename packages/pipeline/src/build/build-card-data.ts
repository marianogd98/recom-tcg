import type { Card } from "@recom-tcg/engine";
import type { OverrideDefinition, PairingDefinition } from "@recom-tcg/rules-schema";
import { tagCard } from "../rules/apply.ts";
import type { CompiledRule } from "../rules/compile.ts";
import { applyOverride } from "../rules/overrides.ts";
import { buildPairingTags } from "./pairing-tags.ts";
import { toEngineCard, toRuleInput } from "../normalize.ts";
import { NON_DECK_LAYOUTS, type ScryfallCard } from "../scryfall/types.ts";

export interface BuildInput {
  rawCards: ScryfallCard[];
  commanderIds: ReadonlySet<string>;
  rules: CompiledRule[];
  /** From rules/overrides.yaml (gramática §3.8). */
  overrides?: OverrideDefinition[];
  /** From rules/formats/commander/pairing.yaml (RN-04). */
  pairings?: PairingDefinition[];
}

export interface BuildResult {
  cards: Card[];
  /** Tokens, emblems and other objects that are not deck cards (RN-18). */
  skipped: number;
  overridesApplied: number;
  /**
   * Overrides whose card name matches no deck card. Usually a typo: the
   * CLI stops, because an override that silently does nothing is worse
   * than no override.
   */
  unknownOverrideCards: string[];
}

/** Stamped next to the data so every result says which data produced it (RN-21). */
export interface Manifest {
  dataDate: string;
  modelVersion: string;
  rulesCount: number;
  overrides: number;
  /** Names in each localized-name index, e.g. { es: 31000 } (RN-11). */
  localizedNames: Record<string, number>;
  cards: number;
  commanders: number;
  tagged: number;
}

/**
 * The data build as a pure function: same input, same output, no files.
 * The CLI (cli/build-data.ts) only reads inputs and writes outputs around it.
 */
export function buildCardData({ rawCards, commanderIds, rules, overrides = [], pairings = [] }: BuildInput): BuildResult {
  const deckCards = rawCards.filter(isDeckCard);
  const overrideByCard = new Map(overrides.map((override) => [override.card, override]));
  const pairingTags = buildPairingTags(deckCards, pairings);

  const cards = deckCards.map((raw) => {
    const input = toRuleInput(raw);
    const ruleTags = tagCard(input, rules);
    const override = overrideByCard.get(raw.name);
    const pairing = pairingTags.get(raw.oracle_id!);
    return {
      ...toEngineCard(raw, commanderIds, input),
      ...(override ? applyOverride(ruleTags, override) : ruleTags),
      ...(pairing ? { pairing } : {})
    };
  });

  const names = new Set(deckCards.map((card) => card.name));
  const unknownOverrideCards = overrides.map((override) => override.card).filter((name) => !names.has(name));
  return {
    cards,
    skipped: rawCards.length - deckCards.length,
    overridesApplied: overrides.length - unknownOverrideCards.length,
    unknownOverrideCards
  };
}

export function isDeckCard(card: ScryfallCard): boolean {
  return Boolean(card.oracle_id) && !NON_DECK_LAYOUTS.has(card.layout);
}

export function createManifest(
  { cards, overridesApplied }: BuildResult,
  versions: { updatedAt: string; modelVersion: string; rulesCount: number; localizedNames?: Record<string, number> }
): Manifest {
  return {
    dataDate: versions.updatedAt.slice(0, 10),
    modelVersion: versions.modelVersion,
    rulesCount: versions.rulesCount,
    overrides: overridesApplied,
    localizedNames: versions.localizedNames ?? {},
    cards: cards.length,
    commanders: cards.filter((card) => card.canBeCommander).length,
    tagged: cards.filter((card) => card.themes.length > 0 || card.roles.length > 0).length
  };
}
