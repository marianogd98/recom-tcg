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

test("prefers the JSON Lines file Scryfall lists since 2026", async () => {
  const { fetchFn } = fakeScryfall({
    [`${ScryfallClient.API_URL}/bulk-data`]: {
      data: [{ type: "oracle_cards", jsonl_download_uri: "https://cdn/oracle.jsonl.gz", updated_at: "2026-10-06T21:01:59Z" }]
    }
  });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  const bulk = await client.oracleBulkFile();
  assert.equal(bulk.downloadUri, "https://cdn/oracle.jsonl.gz");
  assert.equal(bulk.format, "jsonl");
});

test("downloads come back decompressed", async () => {
  const { gzipSync } = await import("node:zlib");
  const fetchFn: FetchFn = async () => new Response(gzipSync('{"object":"card"}'), { status: 200 });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  assert.equal(new TextDecoder().decode(await client.download("https://cdn/file.jsonl.gz")), '{"object":"card"}');
});

test("reads download_uri from the item endpoint when the list omits it", async () => {
  const itemUri = `${ScryfallClient.API_URL}/bulk-data/oracle-id`;
  const { fetchFn } = fakeScryfall({
    [`${ScryfallClient.API_URL}/bulk-data`]: { data: [{ type: "oracle_cards", uri: itemUri, updated_at: "2026-10-06T21:01:59Z" }] },
    [itemUri]: { type: "oracle_cards", download_uri: "https://cdn/oracle.json", updated_at: "2026-10-06T21:01:59Z" }
  });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  assert.equal((await client.oracleBulkFile()).downloadUri, "https://cdn/oracle.json");
});

test("a bulk item without download_uri fails with the fields it did receive", async () => {
  const { fetchFn } = fakeScryfall({
    [`${ScryfallClient.API_URL}/bulk-data`]: { data: [{ type: "oracle_cards", updated_at: "2026-10-06T21:01:59Z", size: 1 }] }
  });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  await assert.rejects(client.oracleBulkFile(), /no download link.*Fields received: type, updated_at, size/);
});

test("HTTP errors stop the run with a clear message", async () => {
  const { fetchFn } = fakeScryfall({});
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  await assert.rejects(client.oracleBulkFile(), /404 Not Found/);
});

test("localized printings: one search per language, every printing, every page (RN-11)", async () => {
  const first = `${ScryfallClient.API_URL}/cards/search?q=lang%3Aes&unique=prints&include_multilingual=true`;
  const { fetchFn, requests } = fakeScryfall({
    [first]: { data: [{ name: "Llanowar Elves", printed_name: "Elfos de Llanowar", lang: "es" }], has_more: true, next_page: "page-2" },
    "page-2": { data: [{ name: "Sol Ring", printed_name: "Anillo solar", lang: "es" }], has_more: false }
  });
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  const printings = await client.localizedPrintings("es");
  assert.deepEqual(printings.map((card) => card.printed_name), ["Elfos de Llanowar", "Anillo solar"]);
  assert.equal(requests.length, 2);
});

test("a search with no results is empty, not an error (Scryfall answers 404)", async () => {
  const { fetchFn } = fakeScryfall({});
  const client = new ScryfallClient({ userAgent: "test", fetchFn, sleep: noWait });
  assert.deepEqual(await client.searchOracleIds("is:commander"), []);
});
