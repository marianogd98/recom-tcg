import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Where everything lives, relative to the repository root.
 * One place to change if the layout ever moves, instead of
 * "../../../.." paths scattered across scripts.
 */
export const REPO_LAYOUT = {
  model: "model.yaml",
  rules: "rules",
  vocabulary: "rules/vocabulary.yaml",
  importProfiles: "import-profiles",
  rawData: "data/raw",
  outData: "data/out"
} as const;

export type RepoPaths = { root: string } & { [K in keyof typeof REPO_LAYOUT]: string };

/** Walks up from `start` until it finds the folder holding pnpm-workspace.yaml. */
export function findRepoRoot(start: string): string {
  let dir = resolve(start);
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No pnpm-workspace.yaml found above ${start}`);
    dir = parent;
  }
  return dir;
}

/** Absolute paths for every entry of REPO_LAYOUT. */
export function repoPaths(start: string): RepoPaths {
  const root = findRepoRoot(start);
  const entries = Object.entries(REPO_LAYOUT).map(([key, rel]) => [key, join(root, rel)]);
  return { root, ...Object.fromEntries(entries) } as RepoPaths;
}
