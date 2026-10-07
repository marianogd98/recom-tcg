/**
 * The key used to look a card name up, in any language (RN-11, RN-13):
 * lower case, without accents, with straight quotes and single spaces.
 *
 *   "Elfos de Llanowar"  → "elfos de llanowar"
 *   "Nazgûl"             → "nazgul"
 *   "Æther Vial"         → "aether vial"
 *   "Urza’s Saga"        → "urza's saga"
 *
 * The build writes the localized-name index with these keys, and the
 * importer normalizes each line the same way before looking it up. Both
 * sides must call this one function, or a name with an accent would be
 * found by one and missed by the other.
 */
export function normalizeCardName(name: string): string {
  return name
    .replace(/[Ææ]/g, "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
