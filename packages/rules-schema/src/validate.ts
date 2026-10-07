/**
 * `pnpm validate:rules` — checks every YAML file contributors edit.
 * Exits with code 1 when anything is wrong, so CI fails the pull request.
 *
 * The logic lives in validation/; this file only wires it and prints.
 */
import { resolve } from "node:path";
import { repoPaths } from "./repo.ts";
import { formatReport } from "./validation/report.ts";
import { SchemaRegistry } from "./validation/schema-registry.ts";
import { validateRepository } from "./validation/validate-repository.ts";

const schemas = new SchemaRegistry(resolve(import.meta.dirname, "../schemas"));
const result = validateRepository(repoPaths(import.meta.dirname), schemas);

const report = formatReport(result);
if (result.problems.length > 0) {
  console.error(report);
  process.exit(1);
}
console.log(report);
