import { readdirSync } from "node:fs";
import { join } from "node:path";
import { compilePattern, readYaml, type RuleDefinition, type RuleFile, type Vocabulary } from "@recom-tcg/rules-schema";

/** A rule with its patterns already compiled. */
export interface CompiledRule {
  def: RuleDefinition;
  textAny: RegExp[];
  textAll: RegExp[];
  textNone: RegExp[];
  typeAny: RegExp[];
  typeNone: RegExp[];
  keywordsAny: RegExp[];
}

/** Loads every rule under rules/themes and rules/roles, expanding macros. */
export function loadRules(rulesDir: string): CompiledRule[] {
  const vocabulary = readYaml<Vocabulary>(join(rulesDir, "vocabulary.yaml"));
  const compile = (patterns?: string[]) => (patterns ?? []).map((p) => compilePattern(p, vocabulary.macros));
  const rules: CompiledRule[] = [];
  for (const sub of ["themes", "roles"]) {
    const dir = join(rulesDir, sub);
    for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const { rules: defs } = readYaml<RuleFile>(join(dir, file));
      for (const def of defs ?? []) {
        rules.push({
          def,
          textAny: compile(def.match.text_any),
          textAll: compile(def.match.text_all),
          textNone: compile(def.match.text_none),
          typeAny: compile(def.match.type_any),
          typeNone: compile(def.match.type_none),
          keywordsAny: compile(def.match.keywords_any)
        });
      }
    }
  }
  return rules;
}
