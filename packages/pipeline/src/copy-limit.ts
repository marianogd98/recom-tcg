import { isBasicLand, type CopyLimit } from "@recom-tcg/engine";
import type { RuleInput } from "./rules/rule-input.ts";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

/**
 * The sentence that breaks singleton, after normalization (the card's name is "~"):
 *   "a deck can have any number of cards named ~."   (Relentless Rats)
 *   "a deck can have up to seven cards named ~."     (Seven Dwarves)
 */
const COPY_SENTENCE = /a deck can have (any number of|up to (\w+)|only one) cards? named ~/;

/**
 * RN-16: how many copies a deck may hold, read from the card's own text.
 * RN-17: basic lands may be played in any number.
 *
 * A closed set of sentences printed by the game, not a judgment call, so
 * it lives in code with a test instead of in the YAML rules.
 */
export function copyLimitOf(card: Pick<RuleInput, "faces" | "typeLine">): CopyLimit {
  if (isBasicLand({ typeLine: card.typeLine })) return "any";
  for (const face of card.faces) {
    const match = COPY_SENTENCE.exec(face);
    if (!match) continue;
    if (match[1] === "any number of") return "any";
    const count = match[2];
    if (count) return NUMBER_WORDS[count] ?? (Number(count) || 1);
  }
  return 1;
}
