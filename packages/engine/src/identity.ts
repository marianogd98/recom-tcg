import type { Color } from "./types.ts";

/** WUBRG order, used to build stable identity keys. */
export const COLOR_ORDER: readonly Color[] = ["W", "U", "B", "R", "G"];

/** Canonical key for an identity: "BG", "WBG", "" for colorless. */
export function identityKey(identity: readonly Color[]): string {
  return COLOR_ORDER.filter((c) => identity.includes(c)).join("");
}

/** True when every color of `inner` is in `outer` (RN-05, eligible pool E(c)). */
export function isSubsetOf(inner: readonly Color[], outer: readonly Color[]): boolean {
  return inner.every((c) => outer.includes(c));
}

export interface IdentitySelection {
  /** Identity keys chosen by the user, e.g. ["BG", "WBG"]. "" means colorless. */
  identities: string[];
  /** RN-05: also accept commanders whose identity is contained in a chosen one. */
  includeSubsets: boolean;
}

/**
 * Whether a commander identity enters the search (RN-05, RN-06).
 * Colorless commanders only appear when "" is explicitly selected.
 */
export function matchesSelection(identity: readonly Color[], selection: IdentitySelection): boolean {
  const key = identityKey(identity);
  if (key === "") return selection.identities.includes("");
  return selection.identities.some((chosen) => {
    if (chosen === key) return true;
    if (!selection.includeSubsets || chosen === "") return false;
    return isSubsetOf(identity, [...chosen] as Color[]);
  });
}

/** Display names for identity keys; the UI translates them through i18n. */
export const IDENTITY_NAMES: Record<string, string> = {
  "": "colorless",
  W: "white", U: "blue", B: "black", R: "red", G: "green",
  WU: "azorius", UB: "dimir", BR: "rakdos", RG: "gruul", WG: "selesnya",
  WB: "orzhov", UR: "izzet", BG: "golgari", WR: "boros", UG: "simic",
  WUB: "esper", UBR: "grixis", BRG: "jund", WRG: "naya", WUG: "bant",
  WBG: "abzan", WUR: "jeskai", UBG: "sultai", WBR: "mardu", URG: "temur",
  WUBR: "yore-tiller", UBRG: "glint-eye", WBRG: "dune-brood", WURG: "ink-treader", WUBG: "witch-maw",
  WUBRG: "five-color"
};
