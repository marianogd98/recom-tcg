import { gunzipSync } from "node:zlib";
import type { ScryfallCard } from "./types.ts";

/**
 * Bulk files come in two shapes:
 * - "json":  one JSON array (the original format, `download_uri`)
 * - "jsonl": JSON Lines, one card per line (`jsonl_download_uri`, introduced
 *   by Scryfall in 2026), served as a gzip-compressed file.
 */
export type BulkFormat = "json" | "jsonl";

const GZIP_MAGIC = [0x1f, 0x8b];

/**
 * Decompresses gzip bytes; returns anything else untouched. The gzip is part
 * of the file itself, not HTTP transport compression, so fetch does not
 * undo it for us.
 */
export function inflateIfGzip(bytes: Uint8Array): Uint8Array {
  const isGzip = bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1];
  return isGzip ? new Uint8Array(gunzipSync(bytes)) : bytes;
}

/** Parses a bulk file's text into cards. Lines that are not card objects are skipped. */
export function parseBulkCards(text: string, format: BulkFormat): ScryfallCard[] {
  const objects: unknown[] =
    format === "json"
      ? (JSON.parse(text) as unknown[])
      : text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => JSON.parse(line) as unknown);
  return objects.filter(isCard);
}

function isCard(value: unknown): value is ScryfallCard {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { object?: unknown }).object;
  return kind === undefined || kind === "card";
}
