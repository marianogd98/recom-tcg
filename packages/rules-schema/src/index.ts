import { readFileSync } from "node:fs";
import { parse } from "yaml";

export type Provides = "asks" | "gives";

/** A rule as written in rules/themes/*.yaml or rules/roles/*.yaml (gramática YAML §3.4). */
export interface RuleDefinition {
  id: string;
  theme?: string;
  role?: string;
  provides?: Provides;
  weight: number;
  capture?: string;
  match: {
    text_any?: string[];
    text_all?: string[];
    text_none?: string[];
    type_any?: string[];
    type_none?: string[];
    keywords_any?: string[];
    produces_mana?: boolean;
  };
  examples: { match: string[]; no_match?: string[] };
}

export interface RuleFile {
  schema_version: 1;
  rules: RuleDefinition[];
}

export interface Vocabulary {
  schema_version: 1;
  themes: { id: string; description: string; parameterized?: boolean }[];
  roles: { id: string }[];
  macros: Record<string, string>;
}

export function readYaml<T>(path: string): T {
  return parse(readFileSync(path, "utf8")) as T;
}

/**
 * Replaces {MACRO} with its pattern from vocabulary.yaml (§3.5).
 * Unknown macros throw, so a typo never silently becomes a literal.
 * Regex quantifiers like {0,80} are left alone.
 */
export function expandMacros(pattern: string, macros: Record<string, string>): string {
  return pattern.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name: string) => {
    const value = macros[name];
    if (value === undefined) throw new Error(`Unknown macro {${name}} in pattern: ${pattern}`);
    return value;
  });
}

/** Compiles a rule pattern. Text and type patterns are matched case-insensitively. */
export function compilePattern(pattern: string, macros: Record<string, string>): RegExp {
  return new RegExp(expandMacros(pattern, macros), "i");
}

export { REPO_LAYOUT, findRepoRoot, repoPaths, type RepoPaths } from "./repo.ts";
