import type { ScryfallCard } from "./types.ts";

/**
 * The fields of a Scryfall card that rules and the build read, and nothing
 * else: fixtures stay small, readable in a diff, and free of prices or URLs
 * that change every day.
 */
export function toFixture(card: ScryfallCard): ScryfallCard {
  return omitUndefined({
    oracle_id: card.oracle_id,
    name: card.name,
    layout: card.layout,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    card_faces: card.card_faces?.map((face) =>
      omitUndefined({ name: face.name, type_line: face.type_line, oracle_text: face.oracle_text, mana_cost: face.mana_cost })
    ),
    color_identity: card.color_identity,
    keywords: card.keywords,
    produced_mana: card.produced_mana,
    legalities: { commander: card.legalities["commander"] ?? "not_legal" }
  });
}

function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
