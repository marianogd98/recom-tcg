import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readYaml, type RuleFile, type Vocabulary } from "@recom-tcg/rules-schema";
import { compileRule, type CompiledRule } from "./compile.ts";

export type { CompiledRule } from "./compile.ts";

/** Loads every rule under rules/themes and rules/roles, expanding macros. */
export function loadRules(rulesDir: string): CompiledRule[] {
  const vocabulary = readYaml<Vocabulary>(join(rulesDir, "vocabulary.yaml"));
  const rules: CompiledRule[] = [];
  for (const sub of ["themes", "roles"]) {
    const dir = join(rulesDir, sub);
    for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const { rules: defs } = readYaml<RuleFile>(join(dir, file));
      for (const def of defs ?? []) rules.push(compileRule(def, vocabulary.macros));
    }
  }
  return rules;
}
