/**
 * Validates every YAML file contributors edit:
 *   1. structure, against the JSON Schemas in ../schemas
 *   2. semantics the schemas cannot express: unique rule ids, themes and roles
 *      present in vocabulary.yaml, macros that exist, regexes that compile.
 *
 * Usage: pnpm validate:rules   (from the repo root)
 * Exits with code 1 and a readable list when anything fails.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import Ajv from "ajv";
import { compilePattern, readYaml, repoPaths, type RuleFile, type Vocabulary } from "./index.ts";

const schemasDir = resolve(import.meta.dirname, "../schemas");
const paths = repoPaths(import.meta.dirname);
const repoRoot = paths.root;

const ajv = new Ajv({ allErrors: true });
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
for (const file of readdirSync(schemasDir)) {
  const schema = JSON.parse(readFileSync(join(schemasDir, file), "utf8"));
  validators.set(file.replace(".schema.json", ""), ajv.compile(schema));
}

/** Which schema applies to each YAML path (relative to the repo root). */
function schemaFor(rel: string): string | null {
  if (rel === "model.yaml") return "model";
  if (rel === "rules/vocabulary.yaml") return "vocabulary";
  if (rel === "rules/overrides.yaml") return "overrides";
  if (/^rules\/(themes|roles)\/[^/]+\.ya?ml$/.test(rel)) return "rule-file";
  if (/^rules\/formats\/[^/]+\/format\.ya?ml$/.test(rel)) return "format";
  if (/^rules\/formats\/[^/]+\/pairing\.ya?ml$/.test(rel)) return "pairing";
  if (/^rules\/formats\/[^/]+\/skeleton\.ya?ml$/.test(rel)) return "skeleton";
  if (/^import-profiles\/[^/]+\.ya?ml$/.test(rel)) return "import-profile";
  return null;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const errors: string[] = [];
const yamlFiles = [
  paths.model,
  ...walk(paths.rules),
  ...walk(paths.importProfiles)
].filter((f) => /\.ya?ml$/.test(f));

for (const file of yamlFiles) {
  const rel = relative(repoRoot, file).split("\\").join("/");
  const schema = schemaFor(rel);
  if (!schema) {
    errors.push(`${rel}: no schema knows this file. Is it in the right folder?`);
    continue;
  }
  let data: unknown;
  try {
    data = readYaml(file);
  } catch (e) {
    errors.push(`${rel}: invalid YAML — ${(e as Error).message}`);
    continue;
  }
  const validate = validators.get(schema)!;
  if (!validate(data)) {
    for (const err of validate.errors ?? []) {
      const where = (err as { instancePath?: string; dataPath?: string }).instancePath ?? (err as { dataPath?: string }).dataPath ?? "";
      errors.push(`${rel}${where ? ` ${where}` : ""}: ${err.message}`);
    }
  }
}

// Semantic checks on rules.
const vocabulary = readYaml<Vocabulary>(paths.vocabulary);
const themes = new Set(vocabulary.themes.map((t) => t.id));
const roles = new Set(vocabulary.roles.map((r) => r.id));
const seen = new Map<string, string>();

for (const file of yamlFiles.filter((f) => schemaFor(relative(repoRoot, f).split("\\").join("/")) === "rule-file")) {
  const rel = relative(repoRoot, file).split("\\").join("/");
  const ruleFile = readYaml<RuleFile>(file);
  for (const rule of ruleFile?.rules ?? []) {
    const prev = seen.get(rule.id);
    if (prev) errors.push(`${rel}: duplicate rule id "${rule.id}" (also in ${prev})`);
    seen.set(rule.id, rel);
    if (rule.theme && !themes.has(rule.theme)) errors.push(`${rel}: rule "${rule.id}" uses unknown theme "${rule.theme}"`);
    if (rule.role && !roles.has(rule.role)) errors.push(`${rel}: rule "${rule.id}" uses unknown role "${rule.role}"`);
    const patterns = [
      ...(rule.match.text_any ?? []), ...(rule.match.text_all ?? []), ...(rule.match.text_none ?? []),
      ...(rule.match.type_any ?? []), ...(rule.match.type_none ?? []), ...(rule.match.keywords_any ?? [])
    ];
    for (const p of patterns) {
      try {
        const re = compilePattern(p, vocabulary.macros);
        if (rule.capture && (rule.match.text_any ?? []).includes(p) && !re.source.includes(`(?<${rule.capture}>`)) {
          errors.push(`${rel}: rule "${rule.id}" captures "${rule.capture}" but pattern has no (?<${rule.capture}>…) group: ${p}`);
        }
      } catch (e) {
        errors.push(`${rel}: rule "${rule.id}" has an invalid pattern — ${(e as Error).message}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) found:\n`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`✓ ${yamlFiles.length} YAML files valid · ${seen.size} rules`);
