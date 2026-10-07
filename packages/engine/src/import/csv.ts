/**
 * A small CSV reader for collection exports (RN-14). Written here instead of
 * pulled from a library because the engine runs in the browser and must
 * stay dependency-free, and because exports have two quirks worth owning:
 *
 * - Excel set to Spanish (or most of Europe and Latin America) saves CSV
 *   with ";" as separator, because "," is the decimal mark there.
 * - Many exports start with a byte-order mark (BOM) that would otherwise
 *   stick to the first column name.
 *
 * Follows RFC 4180: fields may be quoted, quotes inside are doubled (""),
 * and a quoted field may contain separators and line breaks.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, "");
  const separator = detectSeparator(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** The separator is whichever of "," or ";" appears more often in the header line, outside quotes. */
export function detectSeparator(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char === ",") commas++;
    else if (!quoted && char === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}
