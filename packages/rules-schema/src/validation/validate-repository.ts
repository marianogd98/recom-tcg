import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readYaml, type OverrideDefinition, type OverridesFile, type RuleFile, type Vocabulary } from "../index.ts";
import { countOverridesByTag } from "./override-stats.ts";
import type { RepoPaths } from "../repo.ts";
import type { Problem } from "./problem.ts";
import { SchemaRegistry, schemaFor } from "./schema-registry.ts";
import { SEMANTIC_CHECKS, type RuleFileDocument, type SemanticCheck } from "./semantic-checks.ts";

export interface ValidationResult {
  problems: Problem[];
  filesChecked: number;
  rulesChecked: number;
  /** How many overrides touch each theme or role. Many on one tag point to a badly written rule (§3.8). */
  overridesByTag: Record<string, number>;
}

/**
 * Validates every YAML file contributors edit, in two passes:
 *   1. structure, against the JSON Schemas;
 *   2. semantics, with SEMANTIC_CHECKS (only when the vocabulary is valid,
 *      because every semantic check depends on it).
 */
export function validateRepository(
  paths: RepoPaths,
  schemas: SchemaRegistry,
  checks: readonly SemanticCheck[] = SEMANTIC_CHECKS
): ValidationResult {
  const problems: Problem[] = [];
  const ruleFiles: RuleFileDocument[] = [];
  let overrides: OverrideDefinition[] = [];
  let vocabulary: Vocabulary | null = null;

  const files = configFiles(paths);
  for (const absolute of files) {
    const file = relative(paths.root, absolute).split("\\").join("/");
    const schema = schemaFor(file);
    if (!schema) {
      problems.push({ file, message: "no schema knows this file. Is it in the right folder?" });
      continue;
    }

    let data: unknown;
    try {
      data = readYaml(absolute);
    } catch (error) {
      problems.push({ file, message: `invalid YAML — ${(error as Error).message}` });
      continue;
    }

    const errors = schemas.validate(schema, data);
    problems.push(...errors.map((message) => ({ file, message })));
    if (errors.length > 0) continue;

    if (schema === "vocabulary") vocabulary = data as Vocabulary;
    if (schema === "rule-file") ruleFiles.push({ file, rules: (data as RuleFile).rules });
    if (schema === "overrides") overrides = (data as OverridesFile).overrides;
  }

  if (vocabulary) {
    const context = { vocabulary, ruleFiles, overrides };
    problems.push(...checks.flatMap((check) => check.run(context)));
  }

  return {
    problems,
    filesChecked: files.length,
    rulesChecked: ruleFiles.reduce((total, doc) => total + doc.rules.length, 0),
    overridesByTag: countOverridesByTag(overrides)
  };
}

function configFiles(paths: RepoPaths): string[] {
  return [paths.model, ...walk(paths.rules), ...walk(paths.importProfiles)].filter((file) => /\.ya?ml$/.test(file));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
