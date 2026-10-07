import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv.ts";
import { detectProfile, readCsvRows, type ImportProfile } from "./profiles.ts";

const generic: ImportProfile = { id: "generic-csv", detect: { header_contains: ["Name", "Quantity"] }, columns: { name: "Name", quantity: "Quantity" } };
const moxfield: ImportProfile = {
  id: "moxfield",
  detect: { header_contains: ["Count", "Tradelist Count", "Name"] },
  columns: { name: "Name", quantity: "Count" }
};
const archidekt: ImportProfile = {
  id: "archidekt",
  detect: { header_contains: ["Quantity", "Name", "Oracle ID"] },
  columns: { name: "Name", quantity: "Quantity", oracle_id: "Oracle ID" }
};
const profiles = [generic, moxfield, archidekt];

test("the most specific matching profile wins, whatever the order", () => {
  assert.equal(detectProfile(["Quantity", "Name", "Set Code", "Oracle ID"], profiles)?.id, "archidekt");
  assert.equal(detectProfile(["Quantity", "Name", "Set Code", "Oracle ID"], [...profiles].reverse())?.id, "archidekt");
  assert.equal(detectProfile(["Name", "Quantity", "Set code"], profiles)?.id, "generic-csv");
});

test("column names are compared without case or spaces", () => {
  assert.equal(detectProfile([" count", "TRADELIST COUNT", "name "], profiles)?.id, "moxfield");
});

test("no profile for an unknown header", () => {
  assert.equal(detectProfile(["Carta", "Cantidad"], profiles), null);
});

test("reads name and quantity from the profile's columns", () => {
  const rows = parseCsv('Count,Tradelist Count,Name,Edition\n4,0,Lightning Bolt,m10\n1,0,"Kenrith, the Returned King",eld');
  assert.deepEqual(
    readCsvRows(rows, moxfield).map(({ line, name, quantity }) => [line, name, quantity]),
    [
      [2, "Lightning Bolt", 4],
      [3, "Kenrith, the Returned King", 1]
    ]
  );
});

test("an oracle_id column identifies the card directly", () => {
  const rows = parseCsv("Quantity,Name,Oracle ID\n1,Sol Ring,6AD8011D-3471-4369-9D68-B264CC027487");
  assert.equal(readCsvRows(rows, archidekt)[0]?.oracleId, "6ad8011d-3471-4369-9d68-b264cc027487");
});

test("empty quantity means 1; zero means not owned", () => {
  const rows = parseCsv("Name,Quantity\nSol Ring,\nPonder,0");
  assert.deepEqual(
    readCsvRows(rows, generic).map(({ name, quantity }) => [name, quantity]),
    [["Sol Ring", 1]]
  );
});
