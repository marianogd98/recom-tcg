import { normalizeCardName, type Card } from "@recom-tcg/engine";
import type { LocalizedName } from "../scryfall/localized-names.ts";

/**
 * Normalized localized name → oracle_ids (RN-11). Usually one id; more than
 * one when two cards share a translation, and then the importer asks the
 * user which one they mean instead of guessing (RN-13, "ambigua").
 */
export type NameIndex = Record<string, string[]>;

/**
 * Builds the index the browser uses to import a list written in another
 * language. Only deck cards that are in cards.json get in, and a name that
 * is the same as the English one is left out: the importer already finds
 * English names in cards.json, so repeating them would only add weight.
 */
export function buildNameIndex(names: readonly LocalizedName[], cards: readonly Pick<Card, "oracleId" | "name">[]): NameIndex {
  const englishById = new Map(cards.map((card) => [card.oracleId, normalizeCardName(card.name)]));
  const index = new Map<string, Set<string>>();

  for (const { name, oracleId } of names) {
    const english = englishById.get(oracleId);
    const key = normalizeCardName(name);
    if (english === undefined || key === english) continue;
    index.set(key, (index.get(key) ?? new Set()).add(oracleId));
  }

  return Object.fromEntries(
    [...index].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, ids]) => [key, [...ids].sort()])
  );
}
