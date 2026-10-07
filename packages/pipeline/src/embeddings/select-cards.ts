import { isInCommanderPool, type Card } from "@recom-tcg/engine";
import { toRuleInput } from "../normalize.ts";
import type { ScryfallCard } from "../scryfall/types.ts";
import type { EmbeddingCard } from "./build-embeddings.ts";
import { embeddingText } from "./embedding-text.ts";

/**
 * Chooses which cards of cards.json get a vector, and pairs each one with
 * its text from the raw Scryfall data.
 *
 * Only the Commander pool is embedded (legal + banned). Un-sets, Alchemy
 * and memorabilia stay in cards.json, so imports can still recognize and
 * report them (RN-19), but they never compete in the ranking, so they need
 * no vector.
 */
export function selectEmbeddingCards(cards: readonly Card[], rawByOracleId: ReadonlyMap<string, ScryfallCard>): EmbeddingCard[] {
  return cards.flatMap((card, cardIndex) => {
    if (!isInCommanderPool(card)) return [];
    const raw = rawByOracleId.get(card.oracleId);
    if (!raw) throw new Error(`cards.json has ${card.name} but the raw data does not. Run "pnpm data:build" again.`);
    return [
      {
        cardIndex,
        oracleId: card.oracleId,
        text: embeddingText(toRuleInput(raw)),
        colorIdentity: card.colorIdentity,
        canBeCommander: card.canBeCommander
      }
    ];
  });
}
