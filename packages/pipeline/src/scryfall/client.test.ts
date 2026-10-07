import { test } from "node:test";
import assert from "node:assert/strict";
import { ScryfallClient, type FetchFn } from "./client.ts";

/** A fake Scryfall: answers from a map of URL → JSON and records requests. */
function fakeScryfall(routes: Record<string, unknown>) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetchFn: FetchFn = async (url, init) => {
    requests.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const body = routes[url];
    return body === undefined
      ? new Response("not found", { status: 404, statusText: "Not Found" })
      : new Response(JSON.stringify(body), { status: 200 });
  };
  return { fetchFn, requests };
}

const noWait = async () => {};
const SEARCH = `${ScryfallClient.API_URL}/cards/search?q=is%3Acommander&unique=cards`;

test("follows every page of a search and de-duplicates ids", async () => {
  const { fetchFn } = fakeScryfall({
    [SEARCH]: { data: [{ oracle_id: "b" }, { oracle_id: "a" }], has_more: true, next_page: "page-2" },
    "page-2": { data: [{ oracle_id: "a" }, { oracle_id: "c" }], has_more: false }
  });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  assert.deepEqual(await client.searchOracleIds("is:commander"), ["a", "b", "c"]);
});

test("waits between search requests, as Scryfall asks", async () => {
  const waits: number[] = [];
  const { fetchFn } = fakeScryfall({ [SEARCH]: { data: [], has_more: false } });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: async (ms) => void waits.push(ms) });
  await client.searchOracleIds("is:commander");
  assert.deepEqual(waits, [100]);
});

test("identifies itself with User-Agent and Accept headers", async () => {
  const { fetchFn, requests } = fakeScryfall({
    [`${ScryfallClient.API_URL}/bulk-data`]: {
      data: [{ type: "oracle_cards", download_uri: "https://cdn/oracle.json", updated_at: "2026-10-01T09:00:00Z" }]
    }
  });
  const client = new ScryfallClient({ userAgent: "ReComTCG/test", fetchFn, sleep: noWait });
  const bulk = await client.oracleBulkFile();
  assert.equal(bulk.downloadUri, "https://cdn/oracle.json");
  assert.equal(requests[0]?.headers["User-Agent"], "ReComTCG/test");
  assert.ok(requests[0]?.headers["Accept"]?.startsWith("application/json"));
});

test("HTTP errors stop the run with a clear message", async () => {
  const { fetchFn } = fakeScryfall({});
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  await assert.rejects(client.oracleBulkFile(), /404 Not Found/);
});
