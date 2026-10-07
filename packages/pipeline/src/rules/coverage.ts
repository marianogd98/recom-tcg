import type { CompiledRule } from "./compile.ts";
import { matchRule } from "./match.ts";
import type { RuleInput } from "./rule-input.ts";

export interface NamedInput {
  name: string;
  input: RuleInput;
}

export interface RuleCoverage {
  ruleId: string;
  /** The theme or role the rule produces, e.g. "theme:sacrifice/gives" or "role:ramp". */
  tag: string;
  matches: number;
  samples: string[];
}

export interface CoverageReport {
  cards: number;
  tagged: number;
  rules: RuleCoverage[];
  /** Cards per tag, summing every rule that produces it (a card counts once per tag). */
  byTag: Record<string, number>;
}

/**
 * How much of the card pool each rule reaches, with a few sample names to
 * eyeball precision. Contributors run it before and after editing a rule
 * (`pnpm rules:report`) instead of guessing what a regex catches.
 */
export function measureCoverage(cards: readonly NamedInput[], rules: readonly CompiledRule[], sampleSize = 8): CoverageReport {
  const tagged = new Set<string>();
  const cardsByTag = new Map<string, Set<string>>();

  const perRule = rules.map((rule) => {
    const tag = tagOf(rule);
    const matched = cards.filter(({ input }) => matchRule(input, rule) !== null);
    const tagSet = cardsByTag.get(tag) ?? new Set<string>();
    for (const card of matched) {
      tagged.add(card.name);
      tagSet.add(card.name);
    }
    cardsByTag.set(tag, tagSet);
    return { ruleId: rule.def.id, tag, matches: matched.length, samples: evenlySpacedNames(matched, sampleSize) };
  });

  return {
    cards: cards.length,
    tagged: tagged.size,
    rules: perRule,
    byTag: Object.fromEntries([...cardsByTag].map(([tag, set]) => [tag, set.size]).sort())
  };
}

function tagOf({ def }: CompiledRule): string {
  return def.role ? `role:${def.role}` : `theme:${def.theme}/${def.provides}`;
}

/** Samples spread across the alphabet, not just the first matches. */
function evenlySpacedNames(cards: readonly NamedInput[], max: number): string[] {
  if (cards.length <= max) return cards.map((card) => card.name);
  const step = cards.length / max;
  return Array.from({ length: max }, (_, i) => cards[Math.floor(i * step)]!.name);
}
