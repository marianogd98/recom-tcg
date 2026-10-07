/** The subset of Scryfall's card object the pipeline reads. https://scryfall.com/docs/api/cards */
export interface ScryfallFace {
  name: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
}

export interface ScryfallCard {
  oracle_id?: string;
  name: string;
  layout: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  color_identity: string[];
  keywords?: string[];
  produced_mana?: string[];
  legalities: Record<string, string>;
  card_faces?: ScryfallFace[];
  printed_name?: string;
  lang?: string;
}

/** Layouts that are never deck cards (RN-18). */
export const NON_DECK_LAYOUTS = new Set([
  "token",
  "double_faced_token",
  "emblem",
  "art_series",
  "planar",
  "scheme",
  "vanguard",
  "reversible_card"
]);
