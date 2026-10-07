/**
 * Checks JSON Schema cannot express, because they look across files or
 * need to run code (compile a regex).
 *
 * Each check is an object with a name and a run() method. Adding a check is
 * adding an object to SEMANTIC_CHECKS (Open/Closed); each one has a single
 * reason to change (Single Responsibility).
 */
import { compilePattern, type RuleDefinition, type Vocabulary } from "../index.ts";
import type { Problem } from "./problem.ts";

export interface RuleFileDocument {
  file: string;
  rules: RuleDefinition[];
}

export interface SemanticContext {
  vocabulary: Vocabulary;
  ruleFiles: RuleFileDocument[];
}

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

export const SEMANTIC_CHECKS: readonly SemanticCheck[] = [
  uniqueRuleIds,
  knownVocabulary,
  compilablePatterns,
  captureGroupsPresent
];
