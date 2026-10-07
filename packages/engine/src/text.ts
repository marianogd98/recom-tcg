/**
 * Oracle text normalization applied before any rule runs (gramática YAML §3.2):
 * - lower case
 * - the card's own name becomes "~" (also its short name before the comma,
 *   e.g. "Karador" for "Karador, Ghost Chieftain")
 * - reminder text in parentheses is removed
 * - whitespace is collapsed per line
 *
 * Multi-face cards are normalized face by face by the caller.
 */
export function normalizeOracleText(text: string, cardName: string): string {
  let out = text.replace(/\([^)]*\)/g, "");
  const names = selfNames(cardName);
  for (const name of names) {
    out = out.replace(new RegExp(escapeRegExp(name), "gi"), "~");
  }
  return out
    .toLowerCase()
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/** Full name first so the short name never splits it. */
function selfNames(cardName: string): string[] {
  const names = [cardName];
  const comma = cardName.indexOf(",");
  if (comma > 0) names.push(cardName.slice(0, comma));
  return names;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Folds case and diacritics for name matching (RN-13: "sin distinguir
 * mayúsculas ni tildes").
 */
export function foldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
