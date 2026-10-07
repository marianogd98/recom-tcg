import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ImportProfile } from "@recom-tcg/engine";
import { readYaml } from "@recom-tcg/rules-schema";

/**
 * Reads import-profiles/*.yaml (RN-14) into the shape the engine expects.
 * data:build ships them to the browser as import-profiles.json, so adding a
 * collection app is adding a YAML file: no code, no web rebuild.
 */
export function loadImportProfiles(dir: string): ImportProfile[] {
  return readdirSync(dir)
    .filter((file) => /\.ya?ml$/.test(file))
    .sort()
    .map((file) => {
      const { id, detect, columns } = readYaml<ImportProfile & { schema_version: number }>(join(dir, file));
      return { id, detect, columns };
    });
}
