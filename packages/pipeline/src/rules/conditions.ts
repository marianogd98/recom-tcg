/**
 * Match operators: one small object per YAML key under `match:`.
 *
 * Why a registry instead of one big if/else? Each operator is an independent
 * behavior (Single Responsibility). Supporting a new operator, say
 * `mana_value_max`, means adding one entry here and one property in
 * rule-file.schema.json; the code that compiles and evaluates rules does not
 * change (Open/Closed).
 *
 * Two families exist because rules are evaluated face by face:
 * - CardCondition looks at the whole card (type line, keywords, mana).
 * - FaceCondition looks at one face's Oracle text, so `text_any` and
 *   `text_none` must hold on the SAME face of a double-faced card.
 */
import type { RuleInput } from "./rule-input.ts";

export interface CardCondition {
  readonly operator: string;
  test(card: RuleInput): boolean;
}

/** Returned by a face condition that holds. `captured` feeds parameterized themes. */
export interface FaceMatch {
  captured?: string;
}

export interface FaceCondition {
  readonly operator: string;
  /** null when the condition does not hold on this face. */
  evaluate(face: string): FaceMatch | null;
}

/** What a factory needs to build its condition. */
export interface ConditionContext {
  /** Compiles a pattern with the vocabulary macros already applied. */
  compile(pattern: string): RegExp;
  /** Named regex group to capture, from the rule's `capture:`. */
  capture?: string;
}

type Factory<T> = (value: unknown, ctx: ConditionContext) => T;

const compileAll = (value: unknown, ctx: ConditionContext): RegExp[] => (value as string[]).map((p) => ctx.compile(p));

export const CARD_CONDITIONS: Readonly<Record<string, Factory<CardCondition>>> = {
  type_any(value, ctx) {
    const patterns = compileAll(value, ctx);
    return { operator: "type_any", test: (card) => patterns.some((re) => re.test(card.typeLine)) };
  },
  type_none(value, ctx) {
    const patterns = compileAll(value, ctx);
    return { operator: "type_none", test: (card) => !patterns.some((re) => re.test(card.typeLine)) };
  },
  keywords_any(value, ctx) {
    const patterns = compileAll(value, ctx);
    return {
      operator: "keywords_any",
      test: (card) => patterns.some((re) => card.keywords.some((keyword) => re.test(keyword)))
    };
  },
  produces_mana(value) {
    const expected = value as boolean;
    return { operator: "produces_mana", test: (card) => card.producesMana === expected };
  },
  /** Fixing: the card can make mana of at least this many different colors. */
  produces_colors_min(value) {
    const minimum = value as number;
    return { operator: "produces_colors_min", test: (card) => new Set(card.producedColors).size >= minimum };
  }
};

export const FACE_CONDITIONS: Readonly<Record<string, Factory<FaceCondition>>> = {
  text_any(value, ctx) {
    const patterns = compileAll(value, ctx);
    return {
      operator: "text_any",
      evaluate(face) {
        for (const re of patterns) {
          const match = re.exec(face);
          if (!match) continue;
          const captured = ctx.capture ? match.groups?.[ctx.capture] : undefined;
          return captured ? { captured } : {};
        }
        return null;
      }
    };
  },
  text_all(value, ctx) {
    const patterns = compileAll(value, ctx);
    return { operator: "text_all", evaluate: (face) => (patterns.every((re) => re.test(face)) ? {} : null) };
  },
  text_none(value, ctx) {
    const patterns = compileAll(value, ctx);
    return { operator: "text_none", evaluate: (face) => (patterns.some((re) => re.test(face)) ? null : {}) };
  }
};
