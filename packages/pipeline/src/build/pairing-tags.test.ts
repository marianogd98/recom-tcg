import { test } from "node:test";
import assert from "node:assert/strict";
import { readYaml, repoPaths, type PairingFile } from "@recom-tcg/rules-schema";
import type { ScryfallCard } from "../scryfall/types.ts";
import { buildPairingTags } from "./pairing-tags.ts";

// The real pairing.yaml: these tests are also its check against the rules.
const { pairings } = readYaml<PairingFile>(repoPaths(import.meta.dirname).pairing);

// Oracle texts as Scryfall writes them in 2026.
const card = (name: string, oracle_text: string, type_line = "Legendary Creature — Human"): ScryfallCard => ({
  oracle_id: name,
  name,
  layout: "normal",
  type_line,
  oracle_text,
  color_identity: [],
  legalities: { commander: "legal" }
});

const tagsOf = (...cards: ScryfallCard[]) => {
  const tags = buildPairingTags(cards, pairings);
  return Object.fromEntries(cards.map((c) => [c.name, (tags.get(c.oracle_id!) ?? []).map((t) => `${t.id}/${t.side}/${t.key}${t.solo === false ? "/solo:false" : ""}`)]));
};

test("plain Partner fulfils both sides of 'partner', with no key", () => {
  assert.deepEqual(tagsOf(card("Thrasios, Triton Hero", "Partner (You can have two commanders if both have partner.)\n{4}: Scry 1..."))["Thrasios, Triton Hero"], [
    "partner/a/",
    "partner/b/"
  ]);
});

test("'Partner with' names its partner, and that card gets the other side", () => {
  const tags = tagsOf(
    card("Regna, the Redeemer", "Partner with Krav, the Unredeemed (When this creature enters, target player may put Krav into their hand from their library.)\nFlying"),
    card("Krav, the Unredeemed", "Partner with Regna, the Redeemer (When this creature enters, target player may put Regna into their hand from their library.)")
  );
  assert.deepEqual(tags["Regna, the Redeemer"], ["partner-with/a/krav, the unredeemed", "partner-with/b/regna, the redeemer"]);
  assert.deepEqual(tags["Krav, the Unredeemed"], ["partner-with/a/regna, the redeemer", "partner-with/b/krav, the unredeemed"]);
});

test("'Partner with' is not plain Partner", () => {
  const tags = tagsOf(card("Will Kenrith", "Partner with Rowan Kenrith"));
  assert.equal(tags["Will Kenrith"]!.some((tag) => tag.startsWith("partner/")), false);
});

test("Partner—variants carry the text after the dash as key", () => {
  const tags = tagsOf(
    card("Kratos, Stoic Father", "Partner—Father & son (You can have two commanders if both have this ability.)"),
    card("Ellie, Brick Master", "Partner—Survivors (You can have two commanders if both have this ability.)")
  );
  assert.deepEqual(tags["Kratos, Stoic Father"], ["partner-variant/a/father & son", "partner-variant/b/father & son"]);
  assert.deepEqual(tags["Ellie, Brick Master"], ["partner-variant/a/survivors", "partner-variant/b/survivors"]);
});

test("Backgrounds pair with 'Choose a Background' and cannot command alone", () => {
  const tags = tagsOf(
    card("Karlach, Fury of Avernus", "Whenever you attack, ...\nChoose a Background (You can have a Background as a second commander.)"),
    card("Raised by Giants", "Commander creatures you own have base power and toughness 10/10 and are Giants.", "Legendary Enchantment — Background")
  );
  assert.deepEqual(tags["Karlach, Fury of Avernus"], ["choose-a-background/a/"]);
  assert.deepEqual(tags["Raised by Giants"], ["choose-a-background/b//solo:false"]);
});

test("a Doctor pairs with a Doctor's companion", () => {
  const tags = tagsOf(
    card("Donna Noble", "Doctor's companion (You can have two commanders if the other is the Doctor.)"),
    card("The Tenth Doctor", "Allons-y! — Whenever ...", "Legendary Creature — Time Lord Doctor")
  );
  assert.deepEqual(tags["Donna Noble"], ["doctors-companion/a/"]);
  assert.deepEqual(tags["The Tenth Doctor"], ["doctors-companion/b/"]);
});

test("a b side nobody can pair with is not stored", () => {
  assert.deepEqual(tagsOf(card("The Tenth Doctor", "", "Legendary Creature — Time Lord Doctor"))["The Tenth Doctor"], []);
});
