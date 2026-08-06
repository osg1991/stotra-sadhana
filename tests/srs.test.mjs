import test from "node:test";
import assert from "node:assert/strict";
import { buildCards } from "../learning/srs.js";
import tara from "../content/packs/tara-sahasranama.js";

test("buildCards creates three cards per non-empty samuha", () => {
  const samuhas = tara.pravahas.flatMap(p => p.samuhas);
  const cards = buildCards(tara);
  assert.equal(cards.length, samuhas.length * 3);
});

test("card ids are unique", () => {
  const cards = buildCards(tara);
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
});
