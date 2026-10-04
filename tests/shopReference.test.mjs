import { test } from "node:test";
import assert from "node:assert/strict";
import { newOrderReference, isOrderReference, ORDER_REFERENCE_RE } from "../src/lib/shop/reference.ts";

test("newOrderReference has SV-<base36 time>-<6 chars> shape", () => {
  const now = 1_759_000_000_000;
  const ref = newOrderReference(now);
  assert.match(ref, ORDER_REFERENCE_RE);
  assert.ok(ref.startsWith(`SV-${now.toString(36).toUpperCase()}-`));
  assert.equal(ref.split("-")[2].length, 6);
});

test("newOrderReference uses injected randomness deterministically", () => {
  assert.equal(newOrderReference(36, () => 0), "SV-000010-AAAAAA");
  assert.equal(newOrderReference(36, () => 35), "SV-000010-999999");
});

test("newOrderReference is unique across many calls", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(newOrderReference(1_759_000_000_000));
  assert.equal(seen.size, 2000);
});

test("newOrderReference tolerates bad time", () => {
  assert.match(newOrderReference(-5), ORDER_REFERENCE_RE);
  assert.match(newOrderReference(Number.NaN), ORDER_REFERENCE_RE);
});

test("isOrderReference accepts generated refs and rejects junk", () => {
  assert.ok(isOrderReference(newOrderReference()));
  for (const bad of ["", "sv-abc-123456", "SV-ABC", "SV-ABC-12345", "SV-ABCDEF-1234567", "SV-A BCDEF-123456", "../x", null, 5, "SV-LMNOPQ-ABC12/"]) {
    assert.equal(isOrderReference(bad), false, String(bad));
  }
});
