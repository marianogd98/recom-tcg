import { compileRule, type CompiledRule } from "./compile.ts";
import type { RuleSource } from "./rule-source.ts";

export type { CompiledRule } from "./compile.ts";

/** Compiles every rule a source provides, with that source's macros. */
export function loadRules(source: RuleSource): CompiledRule[] {
  const macros = source.macros();
  return source.definitions().map((def) => compileRule(def, macros));
}
