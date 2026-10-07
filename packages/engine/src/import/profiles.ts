import { cleanName } from "./text-list.ts";
import type { ImportedLine } from "./imported-line.ts";

/**
 * How to read one app's CSV export (RN-14). Written in YAML under
 * import-profiles/ and shipped to the browser by data:build; the field
 * names mirror the YAML so the JSON passes through unchanged.
 */
export interface ImportProfile {
  id: string;
  detect: { header_contains: string[] };
  columns: {
    name: string;
    quantity?: string;
    language?: string;
    /** Scryfall's oracle_id. When present it identifies the card without reading the name. */
    oracle_id?: string;
  };
}

/**
 * The profile whose detect columns are all in the header. When several
 * match, the most specific wins (the one that checks more columns), so a
 * generic "Name + Quantity" profile never shadows the ManaBox one, whatever
 * order the files are in. Column names are compared without case or
 * surrounding spaces: apps are not consistent ("Set code" vs "Set Code").
 */
export function detectProfile(header: readonly string[], profiles: readonly ImportProfile[]): ImportProfile | null {
  const columns = new Set(header.map(normalizeColumn));
  const matching = profiles.filter((profile) => profile.detect.header_contains.every((column) => columns.has(normalizeColumn(column))));
  return matching.reduce<ImportProfile | null>(
    (best, profile) => (!best || profile.detect.header_contains.length > best.detect.header_contains.length ? profile : best),
    null
  );
}

const ORACLE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turns CSV rows (header first) into imported lines with the given profile.
 * An empty quantity means 1; a quantity of 0 (a card someone tracks but
 * doesn't own) is not part of the pool.
 */
export function readCsvRows(rows: readonly string[][], profile: ImportProfile): ImportedLine[] {
  const [header = [], ...body] = rows;
  const position = (column: string | undefined) =>
    column === undefined ? -1 : header.findIndex((cell) => normalizeColumn(cell) === normalizeColumn(column));
  const nameAt = position(profile.columns.name);
  const quantityAt = position(profile.columns.quantity);
  const oracleIdAt = position(profile.columns.oracle_id);

  return body.flatMap((cells, index) => {
    const name = cleanName(cells[nameAt] ?? "");
    const quantityCell = (cells[quantityAt] ?? "").trim();
    const quantity = quantityCell === "" ? 1 : Number.parseInt(quantityCell, 10);
    if (name === "" || !(quantity > 0)) return [];

    const oracleId = (cells[oracleIdAt] ?? "").trim();
    return [
      {
        line: index + 2,
        raw: cells.join(","),
        name,
        quantity,
        ...(ORACLE_ID.test(oracleId) ? { oracleId: oracleId.toLowerCase() } : {})
      }
    ];
  });
}

function normalizeColumn(column: string): string {
  return column.trim().toLowerCase();
}
