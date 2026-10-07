import { normalizeCardName } from "../names.ts";
import type { Card } from "../types.ts";
import { boundedEditDistance } from "./edit-distance.ts";

/** Normalized name → oracle_ids, as data:build writes names.<lang>.json (RN-11). */
export type LocalizedNameIndex = Record<string, string[]>;

/** Normalized name → kind ("token", "emblem"…), for objects that are not deck cards (RN-18). */
export type NonDeckNameIndex = Record<string, string>;

/** Thresholds from model.yaml → import (RN-23): never written in code. */
export interface FuzzyMatchOptions {
  /** Most edits a typo may be away from a real name. */
  maxDistance: number;
  /** …and at most this share of the name's length, so short names are not "corrected" into other cards. */
  maxRatio: number;
  /** How many candidates an ambiguous line offers. */
  maxSuggestions: number;
}

/** What one imported name turned out to be (RN-13). */
export type NameResolution =
  | { status: "recognized"; oracleId: string }
  | { status: "corrected"; oracleId: string; distance: number }
  | { status: "ambiguous"; candidates: string[] }
  | { status: "ignored"; kind: string }
  | { status: "unrecognized" };

export interface NameResolverSources {
  cards: readonly Pick<Card, "oracleId" | "name">[];
  localized?: readonly LocalizedNameIndex[];
  nonDeck?: NonDeckNameIndex;
}

/**
 * Finds the card a user meant, in this order:
 *
 * 1. English Oracle name, then any face of a multi-face card (RN-12).
 * 2. A localized name, such as the Spanish index (RN-11).
 * 3. A token, emblem or other non-deck object: ignored, only counted (RN-18).
 * 4. A close spelling: one candidate is "corrected", several "ambiguous".
 *
 * Everything is compared through normalizeCardName(), so case, accents and
 * curly quotes never matter (RN-13). English wins over localized names: a
 * translation that happens to equal another card's English name must not
 * make a correct English line ambiguous.
 *
 * The indexes are built once in the constructor; resolve() is then cheap
 * for exact names and bounded for typos.
 */
export class NameResolver {
  private readonly fullNames = new Map<string, Set<string>>();
  /**
   * Faces are a separate, weaker index. Some cards have a face named like
   * another card ("Emeritus of Conflict // Lightning Bolt"): a line saying
   * "Lightning Bolt" means the card called exactly that, not the face.
   */
  private readonly faceNames = new Map<string, Set<string>>();
  private readonly localized = new Map<string, Set<string>>();
  private readonly nonDeck: Map<string, string>;
  /** Every searchable key grouped by length, for the typo search. */
  private readonly keysByLength = new Map<number, string[]>();

  constructor(sources: NameResolverSources, private readonly fuzzy: FuzzyMatchOptions) {
    for (const card of sources.cards) {
      addTo(this.fullNames, normalizeCardName(card.name), card.oracleId);
      const faces = card.name.split(" // ");
      if (faces.length > 1) for (const face of faces) addTo(this.faceNames, normalizeCardName(face), card.oracleId);
    }
    for (const index of sources.localized ?? []) {
      for (const [key, ids] of Object.entries(index)) for (const id of ids) addTo(this.localized, key, id);
    }
    this.nonDeck = new Map(Object.entries(sources.nonDeck ?? {}));

    for (const key of new Set([...this.fullNames.keys(), ...this.faceNames.keys(), ...this.localized.keys()])) {
      const bucket = this.keysByLength.get(key.length) ?? [];
      bucket.push(key);
      this.keysByLength.set(key.length, bucket);
    }
  }

  resolve(name: string): NameResolution {
    for (const key of variants(normalizeCardName(name))) {
      const ids = this.idsFor(key);
      if (ids) return ids.size === 1 ? { status: "recognized", oracleId: only(ids) } : { status: "ambiguous", candidates: [...ids].sort() };
      const kind = this.nonDeck.get(key);
      if (kind) return { status: "ignored", kind };
    }
    return this.closestSpelling(normalizeCardName(name));
  }

  /** RN-13: one clear candidate is accepted and flagged; several are offered; none is reported. */
  private closestSpelling(key: string): NameResolution {
    const max = Math.min(this.fuzzy.maxDistance, Math.floor(key.length * this.fuzzy.maxRatio));
    if (max === 0) return { status: "unrecognized" };

    let best = max + 1;
    let ids = new Set<string>();
    for (let length = key.length - max; length <= key.length + max; length++) {
      for (const candidate of this.keysByLength.get(length) ?? []) {
        const distance = boundedEditDistance(key, candidate, Math.min(best, max));
        if (distance > max || distance > best) continue;
        if (distance < best) {
          best = distance;
          ids = new Set();
        }
        for (const id of this.idsFor(candidate) ?? []) ids.add(id);
      }
    }

    if (ids.size === 0) return { status: "unrecognized" };
    if (ids.size === 1) return { status: "corrected", oracleId: only(ids), distance: best };
    return { status: "ambiguous", candidates: [...ids].sort().slice(0, this.fuzzy.maxSuggestions) };
  }

  /** Full English names first, then faces, then localized names: the first index that knows the key decides. */
  private idsFor(key: string): Set<string> | undefined {
    return this.fullNames.get(key) ?? this.faceNames.get(key) ?? this.localized.get(key);
  }
}

/** "Fire / Ice" is how many people type a split card; Scryfall writes "Fire // Ice". */
function variants(key: string): string[] {
  const doubleSlash = key.replace(/\s*\/{1,2}\s*/g, " // ");
  return doubleSlash === key ? [key] : [key, doubleSlash];
}

function addTo(map: Map<string, Set<string>>, key: string, id: string): void {
  const ids = map.get(key) ?? new Set<string>();
  ids.add(id);
  map.set(key, ids);
}

function only(ids: Set<string>): string {
  return ids.values().next().value!;
}
