import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot, repoPaths } from "./repo.ts";

const here = import.meta.dirname;

test("finds the repository root from any nested folder", () => {
  const root = findRepoRoot(here);
  assert.ok(existsSync(join(root, "pnpm-workspace.yaml")));
});

test("resolves every layout entry against the root", () => {
  const paths = repoPaths(here);
  assert.equal(paths.vocabulary, join(paths.root, "rules/vocabulary.yaml"));
  assert.ok(existsSync(paths.model));
});
