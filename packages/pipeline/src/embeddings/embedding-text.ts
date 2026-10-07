import type { RuleInput } from "../rules/rule-input.ts";

/**
 * The text the model reads for each card: type line plus normalized Oracle
 * text, face by face. It is the same normalized text the rules see, so the
 * card's own name is already "~": similarity comes from what a card does,
 * never from what it is called (the neutrality principle).
 */
export function embeddingText(card: RuleInput): string {
  return [card.typeLine.toLowerCase(), ...card.faces].filter((part) => part.length > 0).join("\n");
}
