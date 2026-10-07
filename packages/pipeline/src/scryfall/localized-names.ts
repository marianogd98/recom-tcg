import type { ScryfallCard } from "./types.ts";

/** One printed translation of a card: what data:fetch keeps from a localized printing. */
export interface LocalizedName {
  name: string;
  oracleId: string;
}

/**
 * Reduces localized printings to the names they print (RN-11), keeping
 * nothing else: data/raw stays small and the build never sees prices or
 * images. Multi-face cards give each face and the full "A // B" name, so a
 * list can use either (RN-12). Repeated printings collapse into one entry.
 */
export function localizedNames(printings: readonly ScryfallCard[]): LocalizedName[] {
  const seen = new Map<string, LocalizedName>();
  const keep = (name: string | undefined, oracleId: string) => {
    if (name) seen.set(`${oracleId}|${name}`, { name, oracleId });
  };

  for (const card of printings) {
    if (!card.oracle_id) continue; // reversible cards: never deck cards (RN-18)
    const faceNames = (card.card_faces ?? []).map((face) => face.printed_name).filter((name): name is string => Boolean(name));
    if (faceNames.length > 1) {
      for (const name of faceNames) keep(name, card.oracle_id);
      keep(faceNames.join(" // "), card.oracle_id);
    } else {
      keep(card.printed_name ?? faceNames[0], card.oracle_id);
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.oracleId.localeCompare(b.oracleId));
}
