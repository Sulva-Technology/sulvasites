import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLifecycleEmail, emailKind, emailsDue } from "../src/lib/billing/lifecycle.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-10T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const sub = (over = {}) => ({
  status: "trialing", tier: "business", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, emails_sent: [], ...over,
});

test("trial ending email from two days before the end", () => {
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + 2 * DAY) }), NOW), ["trial_ending"]);
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + 3 * DAY) }), NOW), []);
  assert.deepEqual(emailsDue(sub({ trial_ends_at: iso(NOW + DAY), emails_sent: ["trial_ending"] }), NOW), []);
});

test("paused and archive warning are keyed by the pause date", () => {
  const pausedAt = iso(NOW - 22 * DAY);
  const day = pausedAt.slice(0, 10);
  assert.deepEqual(emailsDue(sub({ status: "paused", paused_at: pausedAt }), NOW), [`paused:${day}`, `archive_warning:${day}`]);
  assert.deepEqual(emailsDue(sub({ status: "paused", paused_at: iso(NOW - DAY) }), NOW), [`paused:${iso(NOW - DAY).slice(0, 10)}`]);
});

test("payment failed once per grace window", () => {
  const grace = iso(NOW + 2 * DAY);
  assert.deepEqual(emailsDue(sub({ status: "past_due", grace_ends_at: grace }), NOW), [`payment_failed:${grace.slice(0, 10)}`]);
  assert.deepEqual(emailsDue(sub({ status: "active" }), NOW), []);
});

test("kinds and copy", () => {
  assert.equal(emailKind("paused:2026-11-01"), "paused");
  assert.equal(emailKind("welcome"), "welcome");
  assert.equal(emailKind("nope"), null);
  const mail = buildLifecycleEmail("trial_ending", {
    businessName: "Ada's <Kitchen>", siteUrl: "https://ada.example.com", billingUrl: "https://x/billing", daysLeft: 2,
  });
  assert.match(mail.subject, /2 days left/);
  assert.match(mail.text, /https:\/\/x\/billing/);
  assert.match(mail.html, /Ada&#39;s &lt;Kitchen&gt;/);
  for (const k of ["welcome", "paused", "archive_warning", "payment_failed"]) {
    const m = buildLifecycleEmail(k, { businessName: "A", siteUrl: "https://a", billingUrl: "https://b", daysLeft: 0 });
    assert.ok(m.subject && m.text && m.html, k);
  }
});
