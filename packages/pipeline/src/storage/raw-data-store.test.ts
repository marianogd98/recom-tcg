import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RawDataStore } from "./raw-data-store.ts";

const withTempDir = (fn: (dir: string) => void) => {
  const dir = mkdtempSync(join(tmpdir(), "recom-raw-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("saves and loads a JSON Lines download", () => {
  withTempDir((dir) => {
    const store = new RawDataStore(dir);
    store.saveOracleCards(new TextEncoder().encode('{"object":"card","name":"A"}\n{"object":"card","name":"B"}\n'), "jsonl");
    store.saveCommanderIds(["id-a"]);
    store.saveMeta({ updatedAt: "2026-10-06T21:01:59Z", format: "jsonl" });
    const raw = store.load();
    assert.deepEqual(raw.oracleCards.map((card) => card.name), ["A", "B"]);
    assert.equal(raw.updatedAt, "2026-10-06T21:01:59Z");
  });
});

test("data fetched before JSON Lines (no format in meta) is read as a JSON array", () => {
  withTempDir((dir) => {
    writeFileSync(join(dir, "oracle-cards.json"), '[{"object":"card","name":"A"}]');
    writeFileSync(join(dir, "commanders.json"), "[]");
    writeFileSync(join(dir, "meta.json"), '{"updated_at":"2026-10-01T00:00:00Z"}');
    assert.equal(new RawDataStore(dir).load().oracleCards.length, 1);
  });
});
