import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVariantMatrix,
  countCombinations,
  optionsFromVariants,
  variantLabel,
  MAX_VARIANTS,
} from "../src/lib/shop/variantMatrix.ts";

test("builds cartesian product in option order", () => {
  const rows = buildVariantMatrix({ Size: ["S", "M"], Colour: ["Black"] });
  assert.deepEqual(rows.map((r) => r.options), [
    { Size: "S", Colour: "Black" },
    { Size: "M", Colour: "Black" },
  ]);
  assert.ok(rows.every((r) => r.id === undefined && r.price_kobo === null && r.stock === null && r.sku === null));
  assert.deepEqual(rows.map((r) => r.position), [0, 1]);
});

test("two values x two values gives four combos", () => {
  const rows = buildVariantMatrix({ Size: ["S", "M"], Colour: ["Black", "Red"] });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1].options, { Size: "S", Colour: "Red" });
});

test("empty input, blank names and blank values are ignored; values trimmed and de-duplicated", () => {
  assert.deepEqual(buildVariantMatrix({}), []);
  assert.deepEqual(buildVariantMatrix({ Size: [] }), []);
  const rows = buildVariantMatrix({ " Size ": [" S ", "S", "", "  "], "": ["x"] });
  assert.deepEqual(rows.map((r) => r.options), [{ Size: "S" }]);
});

test("preserves id/price/stock/sku of existing variants matched by options", () => {
  const existing = [
    { id: "a", options: { Size: "M", Colour: "Black" }, price_kobo: 5000, stock: 3, sku: "X-M" },
    { id: "b", options: { Size: "L", Colour: "Black" }, price_kobo: null, stock: 0, sku: null },
  ];
  const rows = buildVariantMatrix({ Size: ["S", "M"], Colour: ["Black"] }, existing);
  assert.equal(rows[0].id, undefined);
  assert.equal(rows[1].id, "a");
  assert.equal(rows[1].price_kobo, 5000);
  assert.equal(rows[1].stock, 3);
  assert.equal(rows[1].sku, "X-M");
});

test("matching ignores key order but requires the same option set", () => {
  const existing = [{ id: "a", options: { Colour: "Black", Size: "M" }, price_kobo: 1, stock: 1, sku: null }];
  assert.equal(buildVariantMatrix({ Size: ["M"], Colour: ["Black"] }, existing)[0].id, "a");
  // adding a new option dimension does not reuse the old variant
  assert.equal(buildVariantMatrix({ Size: ["M"], Colour: ["Black"], Fit: ["Slim"] }, existing)[0].id, undefined);
});

test("an existing variant is reused at most once", () => {
  const existing = [{ id: "a", options: { Size: "S" }, price_kobo: null, stock: null, sku: null }];
  const rows = buildVariantMatrix({ Size: ["S", "S"] }, existing);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "a");
});

test("caps the number of variants", () => {
  const vals = Array.from({ length: 20 }, (_, i) => String(i));
  const rows = buildVariantMatrix({ A: vals, B: vals, C: vals });
  assert.equal(rows.length, MAX_VARIANTS);
  assert.equal(countCombinations({ A: vals, B: vals, C: vals }), 8000);
  assert.equal(countCombinations({}), 0);
});

test("optionsFromVariants recovers option lists in first-seen order", () => {
  const out = optionsFromVariants([
    { options: { Size: "S", Colour: "Black" } },
    { options: { Size: "M", Colour: "Black" } },
    { options: { Size: "S", Colour: "Red" } },
  ]);
  assert.deepEqual(out, { Size: ["S", "M"], Colour: ["Black", "Red"] });
  assert.deepEqual(optionsFromVariants([]), {});
});

test("variantLabel joins values", () => {
  assert.equal(variantLabel({ Size: "M", Colour: "Black" }), "M / Black");
  assert.equal(variantLabel({}), "");
});
