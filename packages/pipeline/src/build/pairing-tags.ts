import { normalizeCardName, type PairingTag } from "@recom-tcg/engine";
import type { PairingDefinition, PairingSide } from "@recom-tcg/rules-schema";
import type { ScryfallCard } from "../scryfall/types.ts";

/**
 * Which side of which pair variant each card fulfils (RN-04), worked out at
 * build time because the browser never sees Oracle text.
 *
 * Every side is checked against the card's own lines of text, with reminder
 * text removed. A side "b" tag is kept only when some card has the matching
 * side "a" key: otherwise `own_name` would tag all 35 000 cards with their
 * own name for nothing.
 */
export function buildPairingTags(cards: readonly ScryfallCard[], pairings: readonly PairingDefinition[]): Map<string, PairingTag[]> {
  const compiled = pairings.map((pairing) => ({ id: pairing.id, a: compileSide(pairing.a), b: compileSide(pairing.b) }));
  const found: { oracleId: string; tag: PairingTag }[] = [];

  for (const card of cards) {
    if (!card.oracle_id) continue;
    const view = { lines: abilityLines(card), typeLine: card.type_line ?? "", name: card.name };
    for (const pairing of compiled) {
      for (const side of ["a", "b"] as const) {
        const key = pairing[side].keyOf(view);
        if (key === null) continue;
        const solo = pairing[side].solo;
        found.push({ oracleId: card.oracle_id, tag: { id: pairing.id, side, key, ...(solo === false ? { solo } : {}) } });
      }
    }
  }

  const aKeys = new Set(found.filter(({ tag }) => tag.side === "a").map(({ tag }) => `${tag.id}|${tag.key}`));
  const tags = new Map<string, PairingTag[]>();
  for (const { oracleId, tag } of found) {
    if (tag.side === "b" && !aKeys.has(`${tag.id}|${tag.key}`)) continue;
    tags.set(oracleId, [...(tags.get(oracleId) ?? []), tag]);
  }
  return tags;
}

interface CardView {
  lines: string[];
  typeLine: string;
  name: string;
}

interface CompiledSide {
  /** The pairing key when the card fulfils this side, or null. */
  keyOf(card: CardView): string | null;
  solo?: false;
}

function compileSide(side: PairingSide): CompiledSide {
  const pattern = side.text_pattern ? new RegExp(side.text_pattern, "i") : null;
  const typeWords = (side.type_all ?? []).map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"));

  return {
    ...(side.solo === false ? { solo: false as const } : {}),
    keyOf(card) {
      if (side.text_line && !card.lines.some((line) => line.toLowerCase() === side.text_line!.toLowerCase())) return null;
      if (!typeWords.every((word) => word.test(card.typeLine))) return null;
      if (pattern) {
        const captured = card.lines.map((line) => pattern.exec(line)?.groups?.["key"]).find(Boolean);
        return captured ? normalizeCardName(captured) : null;
      }
      return side.own_name ? normalizeCardName(card.name) : "";
    }
  };
}

/** Each line of Oracle text, every face, without reminder text in parentheses. */
function abilityLines(card: ScryfallCard): string[] {
  const texts = card.card_faces?.length ? card.card_faces.map((face) => face.oracle_text ?? "") : [card.oracle_text ?? ""];
  return texts
    .flatMap((text) => text.split("\n"))
    .map((line) => line.replace(/\s*\([^)]*\)/g, "").trim())
    .filter(Boolean);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
