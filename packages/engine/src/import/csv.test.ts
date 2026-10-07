import { test } from "node:test";
import assert from "node:assert/strict";
import { detectSeparator, parseCsv } from "./csv.ts";

test("reads a plain comma-separated file", () => {
  assert.deepEqual(parseCsv("Name,Quantity\nSol Ring,1\n"), [
    ["Name", "Quantity"],
    ["Sol Ring", "1"]
  ]);
});

test("names with commas come quoted, and doubled quotes are one quote", () => {
  const rows = parseCsv('Name,Quantity\n"Kenrith, the Returned King",1\n"The ""Ultimate"" Nightmare",2');
  assert.deepEqual(rows[1], ["Kenrith, the Returned King", "1"]);
  assert.deepEqual(rows[2], ['The "Ultimate" Nightmare', "2"]);
});

test("Excel in Spanish saves with semicolons", () => {
  const text = 'Nombre;Cantidad\n"Kenrith, the Returned King";1';
  assert.equal(detectSeparator(text), ";");
  assert.deepEqual(parseCsv(text)[1], ["Kenrith, the Returned King", "1"]);
});

test("ignores a byte-order mark, Windows line ends and blank lines", () => {
  assert.deepEqual(parseCsv("﻿Name,Quantity\r\nSol Ring,1\r\n\r\n"), [
    ["Name", "Quantity"],
    ["Sol Ring", "1"]
  ]);
});

test("a quoted field may span lines", () => {
  assert.deepEqual(parseCsv('Name,Notes\nSol Ring,"line one\nline two"'), [
    ["Name", "Notes"],
    ["Sol Ring", "line one\nline two"]
  ]);
});

test("the last row needs no trailing newline, and empty cells are kept", () => {
  assert.deepEqual(parseCsv("a,b,c\n1,,3"), [
    ["a", "b", "c"],
    ["1", "", "3"]
  ]);
});
