import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addLine, setQty, removeLine, cartCount, parseCart, cartStorageKey,
} from "../src/lib/shop/cart.ts";

const L = (productId, variantId = null, quantity = 1) => ({ productId, variantId, quantity });

test("addLine appends new line without mutating", () => {
  const a = [L("p1")];
  const b = addLine(a, L("p2", null, 2));
  assert.equal(a.length, 1);
  assert.deepEqual(b, [L("p1"), L("p2", null, 2)]);
});

test("addLine merges same product+variant", () => {
  const r = addLine([L("p1", "v1", 2)], L("p1", "v1", 3));
  assert.deepEqual(r, [L("p1", "v1", 5)]);
});

test("addLine keeps different variants separate", () => {
  const r = addLine([L("p1", "v1")], L("p1", "v2"));
  assert.equal(r.length, 2);
  assert.equal(addLine([L("p1", null)], L("p1", "v1")).length, 2);
});

test("addLine caps at 99 default and custom max", () => {
  assert.equal(addLine([L("p1", null, 98)], L("p1", null, 5))[0].quantity, 99);
  assert.equal(addLine([], L("p1", null, 500))[0].quantity, 99);
  assert.equal(addLine([L("p1", null, 3)], L("p1", null, 5), 6)[0].quantity, 6);
});

test("setQty updates, and <=0 removes", () => {
  const a = [L("p1", null, 1), L("p2", null, 1)];
  assert.equal(setQty(a, 1, 4)[1].quantity, 4);
  assert.deepEqual(setQty(a, 0, 0), [L("p2")]);
  assert.deepEqual(setQty(a, 0, -3), [L("p2")]);
  assert.equal(a[0].quantity, 1);
});

test("setQty/removeLine with bad index are no-ops", () => {
  const a = [L("p1")];
  assert.deepEqual(setQty(a, 5, 2), a);
  assert.deepEqual(removeLine(a, 9), a);
  assert.deepEqual(removeLine(a, -1), a);
});

test("removeLine removes", () => {
  assert.deepEqual(removeLine([L("p1"), L("p2")], 0), [L("p2")]);
});

test("cartCount sums quantities", () => {
  assert.equal(cartCount([]), 0);
  assert.equal(cartCount([L("a", null, 2), L("b", "v", 3)]), 5);
});

test("parseCart tolerates garbage", () => {
  assert.deepEqual(parseCart(null), []);
  assert.deepEqual(parseCart(""), []);
  assert.deepEqual(parseCart("not json"), []);
  assert.deepEqual(parseCart('{"a":1}'), []);
  assert.deepEqual(parseCart("42"), []);
});

test("parseCart drops invalid lines and keeps valid", () => {
  const raw = JSON.stringify([
    { productId: "p1", variantId: null, quantity: 2 },
    { productId: "", variantId: null, quantity: 1 },
    { productId: "p2", variantId: 5, quantity: 1 },
    { productId: "p3", variantId: null, quantity: 0 },
    { productId: "p4", variantId: null, quantity: 1.5 },
    { productId: "p5", variantId: "v", quantity: "2" },
    null,
    "x",
    { productId: "p6", variantId: "v6", quantity: 1 },
  ]);
  assert.deepEqual(parseCart(raw), [
    { productId: "p1", variantId: null, quantity: 2 },
    { productId: "p6", variantId: "v6", quantity: 1 },
  ]);
});

test("parseCart treats missing variantId as null and caps quantity", () => {
  assert.deepEqual(parseCart(JSON.stringify([{ productId: "p", quantity: 500 }])), [
    { productId: "p", variantId: null, quantity: 99 },
  ]);
});

test("addLine ignores invalid lines", () => {
  const a = [L("p1")];
  for (const bad of [L("p2", null, 0), L("p2", null, -1), L("p2", null, 1.5), L("p2", null, Number.NaN),
    L("p2", null, Infinity), L("", null, 1), { productId: "p", variantId: 3, quantity: 1 }, null]) {
    assert.deepEqual(addLine(a, bad), a);
  }
});

test("setQty caps at max and rejects non-integers", () => {
  const a = [L("p1")];
  assert.equal(setQty(a, 0, 500)[0].quantity, 99);
  assert.equal(setQty(a, 0, 500, 10)[0].quantity, 10);
  assert.deepEqual(setQty(a, 0, 1.5), a);
  assert.deepEqual(setQty(a, 0, Number.NaN), a);
  assert.deepEqual(setQty(a, 0, Infinity), a);
});

test("cartStorageKey", () => {
  assert.equal(cartStorageKey("abc"), "sulva-cart-abc");
});
