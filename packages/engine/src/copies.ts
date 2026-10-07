import type { Card } from "./types.ts";

export interface CopyOptions {
  /**
   * RN-17: basic lands are assumed unlimited, because every player has
   * piles of them. Set to false to count only the basics the user owns.
   */
  unlimitedBasics?: boolean;
}

/**
 * How many copies of a pool card the model may use (RN-15, RN-16, RN-17).
 *
 * - Singleton (RN-15): 1 or 4 copies of a normal card are the same thing.
 * - Exceptions (RN-16): min(owned, the card's limit); "any" means all owned.
 * - Basic lands (RN-17): unlimited unless the user asks otherwise.
 */
export function usableCopies(card: Pick<Card, "copyLimit" | "typeLine">, owned: number, options: CopyOptions = {}): number {
  if (owned <= 0) return 0;
  if ((options.unlimitedBasics ?? true) && isBasicLand(card)) return Number.POSITIVE_INFINITY;
  if (card.copyLimit === "any") return owned;
  return Math.min(owned, card.copyLimit);
}

/** Plains, Snow-Covered Island, Wastes… every card whose type line says "Basic … Land". */
export function isBasicLand(card: Pick<Card, "typeLine">): boolean {
  return /\bBasic\b[^—]*\bLand\b/.test(card.typeLine);
}
