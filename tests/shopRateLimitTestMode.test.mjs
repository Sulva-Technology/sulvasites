import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWindow } from "../src/lib/shop/rateWindow.ts";
import { isBlockedTestPayment } from "../src/lib/shop/testMode.ts";

test("test-mode payments blocked only in production", () => {
  assert.equal(isBlockedTestPayment("test", "production"), true);
  assert.equal(isBlockedTestPayment("test", "development"), false);
  assert.equal(isBlockedTestPayment("test", undefined), false);
  assert.equal(isBlockedTestPayment("live", "production"), false);
  assert.equal(isBlockedTestPayment(undefined, "production"), false);
});

test("checkWindow limits then recovers", () => {
  const s = new Map();
  assert.equal(checkWindow(s, "k", 2, 1000, 0), null);
  assert.equal(checkWindow(s, "k", 2, 1000, 10), null);
  assert.equal(checkWindow(s, "k", 2, 1000, 20), 1);
  assert.equal(checkWindow(s, "k", 2, 1000, 1500), null);
});

test("checkWindow evicts stale keys over cap and hard-caps size", () => {
  const s = new Map();
  for (let i = 0; i < 10; i++) checkWindow(s, `a${i}`, 5, 1000, 0, 5);
  assert.ok(s.size <= 5);
  const t = new Map();
  for (let i = 0; i < 4; i++) checkWindow(t, `old${i}`, 5, 1000, 0, 5);
  checkWindow(t, "n1", 5, 1000, 5000, 5);
  checkWindow(t, "n2", 5, 1000, 5000, 5);
  assert.ok(!t.has("old0") && t.has("n1") && t.has("n2"));
});
