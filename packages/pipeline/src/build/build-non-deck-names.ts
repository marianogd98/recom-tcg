import { normalizeCardName, type NonDeckNameIndex } from "@recom-tcg/engine";
import { isDeckCard } from "./build-card-data.ts";
import type { ScryfallCard } from "../scryfall/types.ts";

/** How the import report groups objects that are not deck cards (RN-18). */
const KIND_BY_LAYOUT: Record<string, string> = {
  token: "token",
  double_faced_token: "token",
  emblem: "emblem",
  art_series: "art_card"
};

/**
 * Names of tokens, emblems, art cards and other non-deck objects, so the
 * importer can say "ignored: 8 tokens" instead of "8 unknown cards" (RN-18).
 * A collection export from ManaBox lists every Treasure the user owns.
 *
 * A name shared with a real card ("Llanowar Elves" is also a token) is left
 * out: the card wins.
 */
export function buildNonDeckNames(rawCards: readonly ScryfallCard[]): NonDeckNameIndex {
  const deckNames = new Set(rawCards.filter(isDeckCard).flatMap((card) => namesOf(card)));
  const index = new Map<string, string>();

  for (const card of rawCards) {
    if (isDeckCard(card)) continue;
    const kind = KIND_BY_LAYOUT[card.layout] ?? card.layout;
    for (const name of namesOf(card)) if (!deckNames.has(name) && !index.has(name)) index.set(name, kind);
  }
  return Object.fromEntries([...index].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The full name and, for multi-face objects, each face, normalized. */
function namesOf(card: ScryfallCard): string[] {
  const faces = card.name.split(" // ");
  return [card.name, ...(faces.length > 1 ? faces : [])].map(normalizeCardName);
}
