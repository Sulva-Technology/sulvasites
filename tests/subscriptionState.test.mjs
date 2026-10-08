import { test } from "node:test";
import assert from "node:assert/strict";

import { DAY_MS, canTransition, daysLeft, isLive, isUnpaid, sweepStatus } from "../src/lib/billing/subscriptionState.ts";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const sub = (over = {}) => ({
  status: "trialing", tier: "business", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, ...over,
});

test("transitions", () => {
  assert.ok(canTransition("trialing", "active"));
  assert.ok(canTransition("trialing", "paused"));
  assert.ok(canTransition("active", "past_due"));
  assert.ok(canTransition("past_due", "active"));
  assert.ok(canTransition("cancelling", "paused"));
  assert.ok(canTransition("paused", "archived"));
  assert.ok(canTransition("archived", "active"));
  assert.equal(canTransition("active", "trialing"), false);
  assert.equal(canTransition("manual", "paused"), false);
  assert.equal(canTransition("archived", "trialing"), false);
});

test("isLive", () => {
  assert.equal(isLive(sub({ status: "manual" }), NOW), true);
  assert.equal(isLive(sub({ status: "active" }), NOW), true);
  assert.equal(isLive(sub({ trial_ends_at: iso(NOW + 1000) }), NOW), true);
  assert.equal(isLive(sub({ trial_ends_at: iso(NOW - 1000) }), NOW), false);
  assert.equal(isLive(sub({ status: "past_due", grace_ends_at: iso(NOW + DAY_MS) }), NOW), true);
  assert.equal(isLive(sub({ status: "past_due", grace_ends_at: null }), NOW), false);
  assert.equal(isLive(sub({ status: "cancelling", current_period_end: iso(NOW + 1) }), NOW), true);
  assert.equal(isLive(sub({ status: "paused" }), NOW), false);
  assert.equal(isLive(sub({ status: "active", blocked: true }), NOW), false);
});

test("sweepStatus", () => {
  assert.equal(sweepStatus(sub({ trial_ends_at: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ trial_ends_at: iso(NOW + 1) }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "past_due", grace_ends_at: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ status: "cancelling", current_period_end: iso(NOW - 1) }), NOW), "paused");
  assert.equal(sweepStatus(sub({ status: "paused", paused_at: iso(NOW - 30 * DAY_MS) }), NOW), "archived");
  assert.equal(sweepStatus(sub({ status: "paused", paused_at: iso(NOW - 29 * DAY_MS) }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "active" }), NOW), null);
  assert.equal(sweepStatus(sub({ status: "manual" }), NOW), null);
});

test("unpaid statuses and days left", () => {
  assert.deepEqual(["trialing", "past_due", "paused", "active", "cancelling", "manual", "archived"].map(isUnpaid), [true, true, true, false, false, false, false]);
  assert.equal(daysLeft(iso(NOW + 2.2 * DAY_MS), NOW), 3);
  assert.equal(daysLeft(iso(NOW - DAY_MS), NOW), 0);
  assert.equal(daysLeft(null, NOW), 0);
});
