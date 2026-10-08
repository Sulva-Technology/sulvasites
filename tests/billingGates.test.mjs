import { test } from "node:test";
import assert from "node:assert/strict";

import { planCheckoutMode, shopGateMessage, siteGateMessage, staffGateMessage } from "../src/lib/billing/gates.ts";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const future = new Date(NOW + 86_400_000).toISOString();
const sub = (over = {}) => ({
  status: "active", tier: "commerce", trial_ends_at: null, current_period_end: null,
  grace_ends_at: null, paused_at: null, blocked: false, ...over,
});

test("shop gate", () => {
  assert.equal(shopGateMessage(null, "card", NOW), null);
  assert.equal(shopGateMessage(sub({ status: "manual", tier: "starter" }), "card", NOW), null);
  assert.equal(shopGateMessage(sub(), "card", NOW), null);
  assert.match(shopGateMessage(sub({ status: "paused" }), "whatsapp", NOW), /isn't taking orders/);
  assert.match(shopGateMessage(sub({ tier: "business" }), "whatsapp", NOW), /isn't included/);
  assert.match(shopGateMessage(sub({ status: "trialing", trial_ends_at: future }), "card", NOW), /order on WhatsApp/);
  assert.equal(shopGateMessage(sub({ status: "trialing", trial_ends_at: future }), "whatsapp", NOW), null);
});

test("site gate (inbox)", () => {
  assert.equal(siteGateMessage(null, NOW), null);
  assert.equal(siteGateMessage(sub(), NOW), null);
  assert.match(siteGateMessage(sub({ status: "paused" }), NOW), /isn't accepting messages/);
});

test("staff gate", () => {
  assert.equal(staffGateMessage(null, 10), null);
  assert.match(staffGateMessage(sub({ tier: "starter" }), 0), /doesn't include staff/);
  assert.equal(staffGateMessage(sub({ tier: "business" }), 1), null);
  assert.match(staffGateMessage(sub({ tier: "business" }), 2), /includes 2 staff seats/);
});

test("checkout mode under a plan", () => {
  assert.equal(planCheckoutMode("card", { status: null, tier: null }), "card");
  assert.equal(planCheckoutMode("card", { status: "manual", tier: "starter" }), "card");
  assert.equal(planCheckoutMode("card_and_whatsapp", { status: "active", tier: "business" }), null);
  assert.equal(planCheckoutMode("card_and_whatsapp", { status: "trialing", tier: "commerce" }), "whatsapp");
  assert.equal(planCheckoutMode("card", { status: "active", tier: "commerce" }), "card");
});
