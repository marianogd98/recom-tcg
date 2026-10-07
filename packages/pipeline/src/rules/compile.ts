import { compilePattern, type RuleDefinition } from "@recom-tcg/rules-schema";
import { CARD_CONDITIONS, FACE_CONDITIONS, type CardCondition, type FaceCondition } from "./conditions.ts";

/** A rule ready to run: its definition plus the conditions built from `match:`. */
export interface CompiledRule {
  def: RuleDefinition;
  cardConditions: CardCondition[];
  faceConditions: FaceCondition[];
}

/** Turns a YAML rule into conditions. Unknown operators fail loudly, never silently. */
export function compileRule(def: RuleDefinition, macros: Record<string, string>): CompiledRule {
  const ctx = {
    compile: (pattern: string) => compilePattern(pattern, macros),
    ...(def.capture ? { capture: def.capture } : {})
  };
  const cardConditions: CardCondition[] = [];
  const faceConditions: FaceCondition[] = [];

  for (const [operator, value] of Object.entries(def.match)) {
    const cardFactory = CARD_CONDITIONS[operator];
    const faceFactory = FACE_CONDITIONS[operator];
    if (cardFactory) cardConditions.push(cardFactory(value, ctx));
    else if (faceFactory) faceConditions.push(faceFactory(value, ctx));
    else throw new Error(`Rule "${def.id}": unknown match operator "${operator}"`);
  }
  return { def, cardConditions, faceConditions };
}
