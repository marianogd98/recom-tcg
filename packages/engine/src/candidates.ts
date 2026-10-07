import { identityKey, isSubsetOf, matchesSelection, COLOR_ORDER, type IdentitySelection } from "./identity.ts";
import type { Card, Color, PoolEntry } from "./types.ts";

/** One commander, or two sharing command (RN-04), evaluated as a single candidate. */
export interface Candidate {
  /** Sorted, so the same pair always has the same ids in the same order. */
  commanderIds: string[];
  /** The pairing.yaml variant, for pairs. */
  pairingId?: string;
  /** For a pair, the union of both identities (RN-04). */
  colorIdentity: Color[];
}

export interface CandidateSearch {
  candidates: Candidate[];
  /**
   * RN-02: commanders the user owns that fit the chosen identities but are
   * banned. Shown in a note so their absence doesn't look like a bug.
   */
  bannedCommanders: string[];
  /** RN-59: when nothing matches, the closest identities that do have candidates, nearest first. */
  nearestIdentities: { identity: string; candidates: number }[];
}

/**
 * Bloque 1: which cards of the pool can lead a deck in the chosen identities.
 *
 * Only legal cards become candidates (RN-01). The card data says who may
 * command: Scryfall's is:commander, plus pairing.yaml for the Backgrounds
 * that Scryfall lists but that can only command inside a pair.
 *
 * `bannedOwned` is ImportResult.banned: banned cards the import kept out of
 * the pool. They are only used for the RN-02 note.
 */
export function findCandidates(
  pool: readonly PoolEntry[],
  cards: ReadonlyMap<string, Card>,
  selection: IdentitySelection,
  bannedOwned: readonly string[] = []
): CandidateSearch {
  const poolCards = pool.flatMap(({ oracleId }) => cards.get(oracleId) ?? []);
  const all = [...soloCandidates(poolCards), ...formPairs(poolCards)];
  const candidates = all.filter((candidate) => matchesSelection(candidate.colorIdentity, selection));

  const banned = new Set([...bannedOwned, ...poolCards.filter((card) => card.legality === "banned").map((card) => card.oracleId)]);
  const bannedCommanders = [...banned]
    .flatMap((id) => cards.get(id) ?? [])
    .filter((card) => card.canBeCommander && matchesSelection(card.colorIdentity, selection))
    .map((card) => card.oracleId);

  return {
    candidates,
    bannedCommanders,
    nearestIdentities: candidates.length === 0 ? nearestIdentities(all, selection) : []
  };
}

/** RN-01: legal, commander-eligible, and not a card that can only command inside a pair. */
export function soloCandidates(cards: readonly Card[]): Candidate[] {
  return cards
    .filter((card) => card.canBeCommander && card.legality === "legal" && !(card.pairing ?? []).some((tag) => tag.solo === false))
    .map((card) => ({ commanderIds: [card.oracleId], colorIdentity: sortColors(card.colorIdentity) }));
}

/**
 * RN-04: every pair the given cards can form. A card with side "a" of a
 * variant pairs with a different card that has side "b" of the same variant
 * and the same key. Only legal cards pair.
 *
 * Kept separate from findCandidates because RN-63 asks the ranking to pair
 * only its best M pair-capable commanders: it will call this with those.
 */
export function formPairs(cards: readonly Card[]): Candidate[] {
  const legal = cards.filter((card) => card.legality === "legal" && card.pairing?.length);
  const pairs = new Map<string, Candidate>();

  for (const first of legal) {
    for (const tag of first.pairing!.filter((t) => t.side === "a")) {
      for (const second of legal) {
        if (second.oracleId === first.oracleId) continue;
        const fits = second.pairing!.some((other) => other.id === tag.id && other.side === "b" && other.key === tag.key);
        if (!fits) continue;
        const commanderIds = [first.oracleId, second.oracleId].sort();
        const id = `${tag.id}|${commanderIds.join("|")}`;
        if (!pairs.has(id)) {
          pairs.set(id, {
            commanderIds,
            pairingId: tag.id,
            colorIdentity: sortColors([...first.colorIdentity, ...second.colorIdentity])
          });
        }
      }
    }
  }
  return [...pairs.values()];
}

/**
 * E(c) (RN-08, RN-03): the pool cards a candidate could put in its deck —
 * legal, inside its color identity, and not one of its own commanders.
 * Cards the user only has as banned (with "mesa casual" on) stay in: the
 * user chose to play them.
 */
export function eligiblePool(candidate: Candidate, pool: readonly PoolEntry[], cards: ReadonlyMap<string, Card>): Card[] {
  const commanders = new Set(candidate.commanderIds);
  return pool.flatMap(({ oracleId }) => {
    const card = cards.get(oracleId);
    if (!card || commanders.has(oracleId) || card.legality === "not_legal") return [];
    return isSubsetOf(card.colorIdentity, candidate.colorIdentity) ? [card] : [];
  });
}

/**
 * RN-59: identities that have candidates, ordered by how many colors they
 * differ in from the closest chosen identity, then by how many candidates
 * they have.
 */
function nearestIdentities(all: readonly Candidate[], selection: IdentitySelection): { identity: string; candidates: number }[] {
  const counts = new Map<string, number>();
  for (const candidate of all) {
    const key = identityKey(candidate.colorIdentity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const distance = (key: string) =>
    Math.min(...selection.identities.map((chosen) => COLOR_ORDER.filter((color) => chosen.includes(color) !== key.includes(color)).length));

  return [...counts]
    .map(([identity, candidates]) => ({ identity, candidates, distance: distance(identity) }))
    .sort((a, b) => a.distance - b.distance || b.candidates - a.candidates || a.identity.localeCompare(b.identity))
    .slice(0, 3)
    .map(({ identity, candidates }) => ({ identity, candidates }));
}

function sortColors(colors: readonly Color[]): Color[] {
  return COLOR_ORDER.filter((color) => colors.includes(color));
}
