import type { ImportedLine } from "./imported-line.ts";

/**
 * Words that head a section in deck lists from Moxfield, Archidekt, MTG Arena
 * and others ("Commander", "Sideboard", "Creatures (25)", "SIDEBOARD:").
 * They are not cards, so they are skipped instead of reported as unknown.
 */
const SECTION_HEADER =
  /^(?:about|commanders?|companions?|deck|main(?:board)?|side(?:board)?|maybe(?:board)?|considering|tokens?|lands?|creatures?|artifacts?|enchantments?|instants?|sorcer(?:y|ies)|planeswalkers?|battles?|spells?|other)\s*(?:\(\d+\))?\s*:?$/i;

const QUANTITY = /^(\d+)\s*[xX]?\s+/;

/** Decorations that follow the name, removed one after the other. */
const DECORATIONS: readonly RegExp[] = [
  /\s+#\S.*$/, //                          Moxfield tags: "#ramp"
  /\s*\^[^^]*\^/g, //                      Archidekt tags: "^Have,#37d67a^"
  /\s*\[[^\]]*\]/g, //                     Archidekt categories "[Ramp]" or set codes "[CMR]"
  /\s*\*[A-Za-z]+\*/g, //                  foil marks: "*F*", "*E*"
  /\s+\([A-Za-z0-9]{2,6}\)(?:\s+[A-Za-z0-9★†-]+)?\s*$/ // set and collector number: "(CMR) 263"
];

/**
 * Reads a plain-text list (RN-14), one card per line:
 *
 *   4 Lightning Bolt
 *   1x Sol Ring (CMR) 263 *F*
 *   Delver of Secrets // Insectile Aberration
 *
 * Quantity defaults to 1. Edition and collector number are ignored: the
 * unit is the card, not the printing (RN-10). Blank lines, comments ("#",
 * "//") and section headers are skipped.
 */
export function parseTextList(text: string): ImportedLine[] {
  return text.split(/\r?\n/).flatMap((raw, index) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//") || SECTION_HEADER.test(trimmed)) return [];

    const quantityMatch = QUANTITY.exec(trimmed);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const name = cleanName(quantityMatch ? trimmed.slice(quantityMatch[0].length) : trimmed);
    return name === "" ? [] : [{ line: index + 1, raw, name, quantity }];
  });
}

/** Removes what follows a card name in exported lists. Also used for CSV name cells. */
export function cleanName(text: string): string {
  return DECORATIONS.reduce((name, pattern) => name.replace(pattern, ""), text).trim();
}
