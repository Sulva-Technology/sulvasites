import { test } from "node:test";
import assert from "node:assert/strict";
import { priceCart, variantLabel } from "../src/lib/shop/pricing.ts";

const products = [
  { id: "p1", name: "Shirt", price_kobo: 500000, active: true },
  { id: "p2", name: "Mug", price_kobo: 120000, active: true },
  { id: "p3", name: "Hidden", price_kobo: 100, active: false },
];
const variants = [
  { id: "v1", product_id: "p1", price_kobo: null, stock: 5, options: { Size: "M", Colour: "Black" } },
  { id: "v2", product_id: "p1", price_kobo: 600000, stock: 0, options: { Size: "L" } },
  { id: "v3", product_id: "p1", price_kobo: 650000, stock: null, options: { Size: "XL" } },
];
const settings = { delivery_fee_kobo: 150000, pickup_enabled: true };
const L = (productId, variantId, quantity) => ({ productId, variantId, quantity });

test("variantLabel joins option values", () => {
  assert.equal(variantLabel({ Size: "M", Colour: "Black" }), "M / Black");
  assert.equal(variantLabel({}), "");
});

test("prices simple product with delivery", () => {
  const r = priceCart([L("p2", null, 2)], products, variants, settings, "delivery");
  assert.equal(r.items.length, 1);
  assert.deepEqual(r.items[0], {
    lineIndex: 0, productId: "p2", variantId: null, name: "Mug", variantLabel: null,
    unitKobo: 120000, quantity: 2, lineTotalKobo: 240000,
  });
  assert.equal(r.subtotalKobo, 240000);
  assert.equal(r.deliveryKobo, 150000);
  assert.equal(r.totalKobo, 390000);
  assert.deepEqual(r.problems, []);
});

test("pickup has no delivery fee", () => {
  const r = priceCart([L("p2", null, 1)], products, variants, settings, "pickup");
  assert.equal(r.deliveryKobo, 0);
  assert.equal(r.totalKobo, 120000);
});

test("variant uses product price when its price is null, label set", () => {
  const r = priceCart([L("p1", "v1", 2)], products, variants, settings, "pickup");
  assert.equal(r.items[0].unitKobo, 500000);
  assert.equal(r.items[0].variantLabel, "M / Black");
  assert.equal(r.items[0].variantId, "v1");
});

test("variant price overrides product price; null stock is untracked", () => {
  const r = priceCart([L("p1", "v3", 50)], products, variants, settings, "pickup");
  assert.equal(r.items[0].unitKobo, 650000);
  assert.equal(r.subtotalKobo, 650000 * 50);
  assert.deepEqual(r.problems, []);
});

test("unavailable: missing or inactive product, or unknown variant", () => {
  const r = priceCart(
    [L("nope", null, 1), L("p3", null, 1), L("p1", "ghost", 1)],
    products, variants, settings, "delivery",
  );
  assert.deepEqual(r.problems.map((p) => [p.lineIndex, p.reason]), [
    [0, "unavailable"], [1, "unavailable"], [2, "unavailable"],
  ]);
  assert.equal(r.items.length, 0);
});

test("variant_required when product has variants but none chosen", () => {
  const r = priceCart([L("p1", null, 1)], products, variants, settings, "pickup");
  assert.deepEqual(r.problems, [{ lineIndex: 0, reason: "variant_required" }]);
  assert.equal(r.items.length, 0);
});

test("out_of_stock when stock is 0", () => {
  const r = priceCart([L("p1", "v2", 1)], products, variants, settings, "pickup");
  assert.deepEqual(r.problems, [{ lineIndex: 0, reason: "out_of_stock" }]);
});

test("insufficient_stock reports available", () => {
  const r = priceCart([L("p1", "v1", 9)], products, variants, settings, "pickup");
  assert.deepEqual(r.problems, [{ lineIndex: 0, reason: "insufficient_stock", available: 5 }]);
  assert.equal(r.items.length, 0);
});

test("problem lines are excluded from totals, good lines kept", () => {
  const r = priceCart(
    [L("p2", null, 1), L("p1", "v2", 1), L("p1", "v1", 5)],
    products, variants, settings, "delivery",
  );
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.items.map((i) => i.lineIndex), [0, 2]);
  assert.equal(r.subtotalKobo, 120000 + 5 * 500000);
  assert.equal(r.problems.length, 1);
  assert.equal(r.totalKobo, r.subtotalKobo + 150000);
});

test("no delivery fee when subtotal is 0", () => {
  assert.equal(priceCart([], products, variants, settings, "delivery").deliveryKobo, 0);
  const r = priceCart([L("nope", null, 1)], products, variants, settings, "delivery");
  assert.equal(r.deliveryKobo, 0);
  assert.equal(r.totalKobo, 0);
});
