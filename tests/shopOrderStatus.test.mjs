import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedTransitions } from "../src/lib/shop/orderStatus.ts";

const t = (status, paid_at, role) => allowedTransitions({ status, paid_at }, role);

test("pending can only be cancelled", () => {
  assert.deepEqual(t("pending", null, "owner"), ["cancelled"]);
  assert.deepEqual(t("pending", null, "staff"), ["cancelled"]);
});

test("paid: fulfil, cancel, refund (refund not for staff)", () => {
  assert.deepEqual(t("paid", "x", "admin"), ["fulfilled", "cancelled", "refunded"]);
  assert.deepEqual(t("paid", "x", "staff"), ["fulfilled", "cancelled"]);
});

test("fulfilled can only be refunded", () => {
  assert.deepEqual(t("fulfilled", "x", "owner"), ["refunded"]);
  assert.deepEqual(t("fulfilled", "x", "staff"), []);
});

test("cancelled can be refunded only when it was paid", () => {
  assert.deepEqual(t("cancelled", "x", "owner"), ["refunded"]);
  assert.deepEqual(t("cancelled", null, "owner"), []);
});

test("refunded is terminal", () => {
  assert.deepEqual(t("refunded", "x", "admin"), []);
});
