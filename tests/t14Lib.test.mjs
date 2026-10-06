import { test } from "node:test";
import assert from "node:assert/strict";
import { splitTwoTone, parseStat, formatStat, bestValueVariantId, savingKobo } from "../src/templates/template14/lib.ts";

test("splitTwoTone: explicit line break wins", () => {
  assert.deepEqual(splitTwoTone("Cut your screen time.\nIn one scan."), ["Cut your screen time.", "In one scan."]);
});
test("splitTwoTone: first sentence, else near the middle word", () => {
  assert.deepEqual(splitTwoTone("Everyday goods. Delivered fast."), ["Everyday goods.", "Delivered fast."]);
  assert.deepEqual(splitTwoTone("Fresh groceries delivered to your door"), ["Fresh groceries delivered", "to your door"]);
  assert.deepEqual(splitTwoTone("Shop"), ["", "Shop"]);
  assert.deepEqual(splitTwoTone(""), ["", ""]);
});

test("parseStat reads numbers with prefix/suffix and separators", () => {
  assert.deepEqual(parseStat("2,000+ orders"), { prefix: "", value: 2000, decimals: 0, suffix: "+ orders" });
  assert.deepEqual(parseStat("₦0 delivery"), { prefix: "₦", value: 0, decimals: 0, suffix: " delivery" });
  assert.deepEqual(parseStat("4.9 rating"), { prefix: "", value: 4.9, decimals: 1, suffix: " rating" });
  assert.equal(parseStat("Fast delivery"), null);
});
test("formatStat keeps separators and decimals", () => {
  const s = parseStat("2,000+ orders");
  assert.equal(formatStat(s, 1234.4), "1,234+ orders");
  assert.equal(formatStat(parseStat("4.9 rating"), 4.9), "4.9 rating");
});

test("bestValueVariantId: biggest saving vs compare-at, only if >1 variant saves", () => {
  const v = [{ id: "a", priceKobo: 900000 }, { id: "b", priceKobo: 1700000 }, { id: "c", priceKobo: null }];
  assert.equal(bestValueVariantId(v, 1000000, 1800000), "a");
  assert.equal(bestValueVariantId([{ id: "a", priceKobo: null }], 1000, 2000), null);
  assert.equal(bestValueVariantId(v, 1000000, null), null);
});
test("savingKobo never negative", () => {
  assert.equal(savingKobo(800, 1000), 200);
  assert.equal(savingKobo(1200, 1000), 0);
  assert.equal(savingKobo(1000, null), 0);
});
