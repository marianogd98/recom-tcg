import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { inflateIfGzip, parseBulkCards } from "./bulk-file.ts";

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (data: Uint8Array) => new TextDecoder().decode(data);

test("gzip files are decompressed, plain files pass through", () => {
  const content = '{"object":"card","name":"Sol Ring"}';
  assert.equal(text(inflateIfGzip(new Uint8Array(gzipSync(content)))), content);
  assert.equal(text(inflateIfGzip(bytes(content))), content);
});

test("JSON Lines: one card per line, blank lines ignored", () => {
  const cards = parseBulkCards('{"object":"card","name":"A"}\n\n{"object":"card","name":"B"}\n', "jsonl");
  assert.deepEqual(cards.map((card) => card.name), ["A", "B"]);
});

test("the original JSON array still works", () => {
  const cards = parseBulkCards('[{"object":"card","name":"A"}]', "json");
  assert.deepEqual(cards.map((card) => card.name), ["A"]);
});

test("objects that are not cards are skipped", () => {
  const cards = parseBulkCards('{"object":"list","has_more":false}\n{"object":"card","name":"A"}', "jsonl");
  assert.deepEqual(cards.map((card) => card.name), ["A"]);
});
