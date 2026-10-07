import { test } from "node:test";
import assert from "node:assert/strict";
import type { ScryfallCard } from "./types.ts";
import { localizedNames } from "./localized-names.ts";

const printing = (fields: Partial<ScryfallCard>): ScryfallCard => ({
  name: "English",
  layout: "normal",
  color_identity: [],
  legalities: {},
  lang: "es",
  ...fields
});

test("keeps the printed name with its oracle_id", () => {
  const names = localizedNames([printing({ oracle_id: "elves", name: "Llanowar Elves", printed_name: "Elfos de Llanowar" })]);
  assert.deepEqual(names, [{ name: "Elfos de Llanowar", oracleId: "elves" }]);
});

test("every translation a card ever had is kept, each only once", () => {
  const names = localizedNames([
    printing({ oracle_id: "x", printed_name: "Traducción vieja" }),
    printing({ oracle_id: "x", printed_name: "Traducción nueva" }),
    printing({ oracle_id: "x", printed_name: "Traducción nueva" })
  ]);
  assert.deepEqual(names.map((entry) => entry.name), ["Traducción nueva", "Traducción vieja"]);
});

test("double-faced cards give each face and the full name (RN-12)", () => {
  const names = localizedNames([
    printing({
      oracle_id: "delver",
      layout: "transform",
      card_faces: [
        { name: "Delver of Secrets", printed_name: "Descubridor de secretos" },
        { name: "Insectile Aberration", printed_name: "Aberración insectil" }
      ]
    })
  ]);
  assert.deepEqual(names.map((entry) => entry.name), ["Aberración insectil", "Descubridor de secretos", "Descubridor de secretos // Aberración insectil"]);
});

test("printings without an oracle_id or a printed name are skipped", () => {
  assert.deepEqual(localizedNames([printing({ printed_name: "Sin id" }), printing({ oracle_id: "y" })]), []);
});
