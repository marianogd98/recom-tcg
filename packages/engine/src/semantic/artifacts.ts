import type { Card } from "../types.ts";
import { EmbeddingTable } from "./vector.ts";

/**
 * The contract between the data build (which writes embeddings.json and
 * embeddings.bin) and the browser (which reads them). It lives in the engine
 * because both sides import it: change it in one place and TypeScript points
 * at every reader and writer that must follow.
 */
export interface EmbeddingHeader {
  model: string;
  dimensions: number;
  quantization: "int8";
  /** Date of the card data these vectors belong to (cards.json's manifest). */
  dataDate: string;
  /** Length of cards.json when the vectors were built, to detect mismatches. */
  cardCount: number;
  /** Row r of embeddings.bin is the card at cards.json[cardIndexes[r]]. */
  cardIndexes: number[];
  quantileLevels: readonly number[];
}

/**
 * Cards that belong in the Commander pool: legal ones, plus banned ones,
 * which the app still needs for RN-02 notes and the "mesa casual" option
 * (RN-19). Everything else (Un-sets, Alchemy, memorabilia) is out.
 */
export function isInCommanderPool(card: Pick<Card, "legality">): boolean {
  return card.legality === "legal" || card.legality === "banned";
}

/**
 * Joins embeddings.bin with cards.json. Refuses files from different builds,
 * which would silently attach vectors to the wrong cards.
 */
export function openEmbeddingTable(header: EmbeddingHeader, vectors: Int8Array, cards: readonly Card[]): EmbeddingTable {
  if (header.cardCount !== cards.length) {
    throw new Error(
      `embeddings.json was built for ${header.cardCount} cards but cards.json has ${cards.length}. ` +
        `Run "pnpm data:build" and "pnpm data:embed" again.`
    );
  }
  const oracleIds = header.cardIndexes.map((index) => {
    const card = cards[index];
    if (!card) throw new Error(`embeddings.json points at card #${index}, which cards.json does not have`);
    return card.oracleId;
  });
  return new EmbeddingTable(oracleIds, header.dimensions, vectors);
}
