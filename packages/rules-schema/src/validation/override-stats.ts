import { parseTagSelector, type OverrideDefinition } from "../index.ts";

/**
 * Overrides per theme or role, counting each card once per tag. The spec
 * asks CI to show it (§3.8): a tag that keeps collecting overrides is a rule
 * that should be rewritten, not patched card by card.
 */
export function countOverridesByTag(overrides: readonly OverrideDefinition[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const { add = [], remove = [] } of overrides) {
    const touched = new Set([
      ...add.map((tag) => ("role" in tag ? tag.role : tag.theme.split(":")[0]!)),
      ...remove.map((entry) => parseTagSelector(entry).base)
    ]);
    for (const tag of touched) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
}
