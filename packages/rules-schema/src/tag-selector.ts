import type { Provides } from "./index.ts";

/**
 * What an override's `remove:` entry points at (gramática YAML §3.8):
 *
 *   "counters"        → the counters theme, both directions (or a role named so)
 *   "counters/gives"  → only the direction that gives
 *   "tribal"          → every tribal tag: tribal:elf, tribal:zombie…
 *   "tribal:elf"      → just that one
 *
 * Parsed in one place so the validator and the build read it the same way.
 */
export interface TagSelector {
  /** Theme or role id, without the captured value: "tribal", "counters", "ramp". */
  base: string;
  /** Captured value of a parameterized theme: "elf" in "tribal:elf". */
  param?: string;
  provides?: Provides;
}

export function parseTagSelector(text: string): TagSelector {
  const [tag = "", direction] = text.split("/");
  const [base = "", param] = tag.split(":");
  return {
    base,
    ...(param ? { param } : {}),
    ...(direction === "asks" || direction === "gives" ? { provides: direction } : {})
  };
}

/** True when the selector covers a theme tag such as "tribal:elf" in direction "asks". */
export function selectsTheme(selector: TagSelector, theme: string, provides: Provides): boolean {
  const [base, param] = theme.split(":");
  if (base !== selector.base) return false;
  if (selector.param && selector.param !== param) return false;
  return !selector.provides || selector.provides === provides;
}

/** Roles have no captured value and no direction: only a bare id selects them. */
export function selectsRole(selector: TagSelector, role: string): boolean {
  return !selector.param && !selector.provides && selector.base === role;
}
