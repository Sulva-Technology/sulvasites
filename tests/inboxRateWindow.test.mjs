import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWindow } from "../src/lib/shop/rateWindow.ts";
import { INBOX_LIMITS } from "../src/lib/inbox/limits.ts";

test("inbox per-IP window: 5 pass, 6th limited, recovers after window", () => {
  const s = new Map();
  const { ipMax, ipWindowMs } = INBOX_LIMITS;
  for (let i = 0; i < ipMax; i++) assert.equal(checkWindow(s, "ip:1", ipMax, ipWindowMs, i), null);
  assert.ok(checkWindow(s, "ip:1", ipMax, ipWindowMs, 10) > 0);
  assert.equal(checkWindow(s, "ip:2", ipMax, ipWindowMs, 10), null);
  assert.equal(checkWindow(s, "ip:1", ipMax, ipWindowMs, ipWindowMs + 100), null);
});

test("inbox limits sane", () => {
  assert.ok(INBOX_LIMITS.siteMax > INBOX_LIMITS.ipMax);
  assert.ok(INBOX_LIMITS.maxBodyChars <= 32 * 1024);
});
