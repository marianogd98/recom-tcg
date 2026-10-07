import type { CompiledRule } from "./compile.ts";
import type { FaceCondition, FaceMatch } from "./conditions.ts";
import type { RuleInput } from "./rule-input.ts";

/**
 * A rule matches when every card condition holds and, if it has text
 * conditions, all of them hold on at least one face.
 * Returns null when it does not match.
 */
export function matchRule(card: RuleInput, rule: CompiledRule): FaceMatch | null {
  if (!rule.cardConditions.every((condition) => condition.test(card))) return null;
  if (rule.faceConditions.length === 0) return {};

  for (const face of card.faces) {
    const match = matchFace(face, rule.faceConditions);
    if (match) return match;
  }
  return null;
}

function matchFace(face: string, conditions: FaceCondition[]): FaceMatch | null {
  let captured: string | undefined;
  for (const condition of conditions) {
    const result = condition.evaluate(face);
    if (!result) return null;
    captured ??= result.captured;
  }
  return captured ? { captured } : {};
}
