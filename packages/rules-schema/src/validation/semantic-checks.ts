/**
 * Checks JSON Schema cannot express, because they look across files or
 * need to run code (compile a regex).
 *
 * Each check is an object with a name and a run() method. Adding a check is
 * adding an object to SEMANTIC_CHECKS (Open/Closed); each one has a single
 * reason to change (Single Responsibility).
 */
import { compilePattern, parseTagSelector, type OverrideDefinition, type RuleDefinition, type Vocabulary } from "../index.ts";
import type { Problem } from "./problem.ts";

export interface RuleFileDocument {
  file: string;
  rules: RuleDefinition[];
}

export interface SemanticContext {
  vocabulary: Vocabulary;
  ruleFiles: RuleFileDocument[];
  /** From rules/overrides.yaml; empty when the file has none. */
  overrides: OverrideDefinition[];
}

export const OVERRIDES_FILE = "rules/overrides.yaml";

export interface SemanticCheck {
  readonly name: string;
  run(ctx: SemanticContext): Problem[];
}

/** Calls fn for every rule, with the file it lives in. */
function eachRule(ctx: SemanticContext, fn: (rule: RuleDefinition, file: string) => Problem[]): Problem[] {
  return ctx.ruleFiles.flatMap(({ file, rules }) => rules.flatMap((rule) => fn(rule, file)));
}

function patternsOf(rule: RuleDefinition): string[] {
  const { produces_mana: _flag, ...patternOperators } = rule.match;
  return Object.values(patternOperators)
    .flat()
    .filter((pattern): pattern is string => typeof pattern === "string");
}

export const uniqueRuleIds: SemanticCheck = {
  name: "unique rule ids",
  run(ctx) {
    const firstSeen = new Map<string, string>();
    return eachRule(ctx, (rule, file) => {
      const previous = firstSeen.get(rule.id);
      if (!previous) {
        firstSeen.set(rule.id, file);
        return [];
      }
      return [{ file, message: `duplicate rule id "${rule.id}" (also in ${previous})` }];
    });
  }
};

export const knownVocabulary: SemanticCheck = {
  name: "themes and roles exist in vocabulary.yaml",
  run(ctx) {
    const themes = new Set(ctx.vocabulary.themes.map((theme) => theme.id));
    const roles = new Set(ctx.vocabulary.roles.map((role) => role.id));
    return eachRule(ctx, (rule, file) => {
      const problems: Problem[] = [];
      if (rule.theme && !themes.has(rule.theme)) problems.push({ file, message: `rule "${rule.id}" uses unknown theme "${rule.theme}"` });
      if (rule.role && !roles.has(rule.role)) problems.push({ file, message: `rule "${rule.id}" uses unknown role "${rule.role}"` });
      return problems;
    });
  }
};

export const compilablePatterns: SemanticCheck = {
  name: "patterns compile with the vocabulary macros",
  run(ctx) {
    return eachRule(ctx, (rule, file) =>
      patternsOf(rule).flatMap((pattern) => {
        try {
          compilePattern(pattern, ctx.vocabulary.macros);
          return [];
        } catch (error) {
          return [{ file, message: `rule "${rule.id}" has an invalid pattern — ${(error as Error).message}` }];
        }
      })
    );
  }
};

export const captureGroupsPresent: SemanticCheck = {
  name: "captured groups exist in text_any",
  run(ctx) {
    return eachRule(ctx, (rule, file) => {
      if (!rule.capture) return [];
      const group = `(?<${rule.capture}>`;
      const hasGroup = (rule.match.text_any ?? []).some((pattern) => pattern.includes(group));
      return hasGroup ? [] : [{ file, message: `rule "${rule.id}" captures "${rule.capture}" but no text_any pattern has a ${group}…) group` }];
    });
  }
};

/**
 * An override can only use the closed vocabulary, like a rule. A captured
 * value ("tribal:elf") only makes sense on a parameterized theme.
 */
export const overridesUseVocabulary: SemanticCheck = {
  name: "overrides use themes and roles from vocabulary.yaml",
  run({ vocabulary, overrides }) {
    const themes = new Map(vocabulary.themes.map((theme) => [theme.id, theme.parameterized === true]));
    const roles = new Set(vocabulary.roles.map((role) => role.id));
    const problem = (card: string, message: string): Problem => ({ file: OVERRIDES_FILE, message: `"${card}": ${message}` });

    return overrides.flatMap(({ card, add = [], remove = [] }) => {
      const problems: Problem[] = [];
      for (const tag of add) {
        if ("role" in tag) {
          if (!roles.has(tag.role)) problems.push(problem(card, `adds unknown role "${tag.role}"`));
          continue;
        }
        const [base = "", param] = tag.theme.split(":");
        if (!themes.has(base)) problems.push(problem(card, `adds unknown theme "${base}"`));
        else if (param && !themes.get(base)) problems.push(problem(card, `theme "${base}" is not parameterized, so "${tag.theme}" is invalid`));
      }
      for (const entry of remove) {
        const { base, param, provides } = parseTagSelector(entry);
        const isTheme = themes.has(base);
        if (!isTheme && !roles.has(base)) problems.push(problem(card, `removes "${entry}", which is neither a theme nor a role`));
        else if (!isTheme && (param || provides)) problems.push(problem(card, `"${entry}": roles have no captured value or direction`));
        else if (param && !themes.get(base)) problems.push(problem(card, `theme "${base}" is not parameterized, so "${entry}" is invalid`));
      }
      return problems;
    });
  }
};

/** Two entries for the same card would make the result depend on their order. */
export const uniqueOverrideCards: SemanticCheck = {
  name: "one override per card",
  run({ overrides }) {
    const seen = new Set<string>();
    return overrides.flatMap(({ card }) => {
      if (!seen.has(card)) {
        seen.add(card);
        return [];
      }
      return [{ file: OVERRIDES_FILE, message: `"${card}" has more than one override; merge them into one entry` }];
    });
  }
};

export const SEMANTIC_CHECKS: readonly SemanticCheck[] = [
  uniqueRuleIds,
  knownVocabulary,
  compilablePatterns,
  captureGroupsPresent,
  overridesUseVocabulary,
  uniqueOverrideCards
];
