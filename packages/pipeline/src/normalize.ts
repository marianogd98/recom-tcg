import { normalizeOracleText, type Card, type Color } from "@recom-tcg/engine";
import type { ScryfallCard } from "./scryfall/types.ts";
import type { RuleInput } from "./rules/rule-input.ts";

/** Builds what the rules look at, face by face (gramática §3.2). */
export function toRuleInput(card: ScryfallCard): RuleInput {
  const faces = card.card_faces?.length
    ? card.card_faces.map((f) => normalizeOracleText(f.oracle_text ?? "", f.name))
    : [normalizeOracleText(card.oracle_text ?? "", card.name)];
  const typeLine = card.type_line ?? card.card_faces?.map((f) => f.type_line ?? "").join(" // ") ?? "";
  return {
    faces,
    typeLine,
    keywords: card.keywords ?? [],
    producesMana: (card.produced_mana ?? []).length > 0
  };
}

/** RN-47: a modal double-faced card with a land back face counts as half a land. */
export function landValue(card: ScryfallCard): number {
  const faces = card.card_faces ?? [];
  if (card.layout === "modal_dfc" && faces.length === 2) {
    const [front, back] = faces;
    const frontIsLand = /\bLand\b/.test(front?.type_line ?? "");
    const backIsLand = /\bLand\b/.test(back?.type_line ?? "");
    if (!frontIsLand && backIsLand) return 0.5;
  }
  return /\bLand\b/.test(card.type_line ?? "") && !card.card_faces ? 1 : 0;
}

const LEGALITY = new Set(["legal", "banned", "not_legal", "restricted"]);

/** Converts a Scryfall card into the engine's Card, without tags. */
export function toEngineCard(card: ScryfallCard, commanderIds: Set<string>): Omit<Card, "themes" | "roles"> {
  const legality = card.legalities["commander"] ?? "not_legal";
  return {
    oracleId: card.oracle_id ?? "",
    name: card.name,
    manaValue: card.cmc ?? 0,
    colorIdentity: card.color_identity as Color[],
    typeLine: card.type_line ?? "",
    keywords: card.keywords ?? [],
    legality: (LEGALITY.has(legality) ? legality : "not_legal") as Card["legality"],
    canBeCommander: commanderIds.has(card.oracle_id ?? ""),
    copyLimit: null, // RN-16: set by a role rule in M1
    landValue: landValue(card)
  };
}
