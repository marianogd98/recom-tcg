import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { repoPaths } from "../repo.ts";
import { schemaFor, SchemaRegistry } from "./schema-registry.ts";
import { validateRepository } from "./validate-repository.ts";

test("routes each YAML file to its schema", () => {
  assert.equal(schemaFor("model.yaml"), "model");
  assert.equal(schemaFor("rules/themes/tokens.yaml"), "rule-file");
  assert.equal(schemaFor("rules/formats/commander/pairing.yaml"), "pairing");
  assert.equal(schemaFor("rules/notes.txt"), null);
});

test("the repository's own YAML files are valid", () => {
  const schemas = new SchemaRegistry(resolve(import.meta.dirname, "../../schemas"));
  const result = validateRepository(repoPaths(import.meta.dirname), schemas);
  assert.deepEqual(result.problems, []);
  assert.ok(result.rulesChecked > 0);
});
