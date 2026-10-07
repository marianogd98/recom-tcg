/**
 * Oracle text normalization applied before any rule runs (gramática YAML §3.2):
 * - lower case
 * - every way a card refers to itself becomes "~":
 *   - its name, and its short name before the comma ("Karador" for
 *     "Karador, Ghost Chieftain"), as older Oracle text does;
 *   - "this creature", "this artifact"… as Oracle text has done since
 *     Wizards' 2025 templating update ("Whenever this creature or another
 *     creature dies…" on Blood Artist);
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
  out = out.replace(SELF_REFERENCE, "~");
  return out
    .toLowerCase()
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/** "this <card type>": how current Oracle text names the card itself. */
const SELF_REFERENCE =
  /\bthis (?:creature|artifact|enchantment|land|planeswalker|battle|permanent|spell|card|token|vehicle|equipment|aura|saga|class|case|room|siege)\b/gi;

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
