import { test } from "node:test";
import assert from "node:assert/strict";

import { COMPARE_ROWS, effectiveAiLimit, featuresForSite, planFeatures } from "../src/lib/billing/planFeatures.ts";

test("tier features match the spec table", () => {
  assert.deepEqual(planFeatures("starter"), { badge: true, customDomain: false, businessData: false, insights: false, aiMonthly: 20, staffSeats: 0, shop: false });
  assert.deepEqual(planFeatures("business"), { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 100, staffSeats: 2, shop: false });
  assert.deepEqual(planFeatures("commerce"), { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 200, staffSeats: 5, shop: true });
});

test("manual, missing or unknown subscriptions have no plan limits", () => {
  assert.equal(featuresForSite(null), null);
  assert.equal(featuresForSite({ status: "manual", tier: "starter" }), null);
  assert.equal(featuresForSite({ status: "active", tier: "gold" }), null);
});

test("trial sites always show the badge", () => {
  assert.equal(featuresForSite({ status: "trialing", tier: "commerce" }).badge, true);
  assert.equal(featuresForSite({ status: "active", tier: "commerce" }).badge, false);
});

test("AI limit: admins unlimited, plans use their allowance, otherwise the fallback", () => {
  assert.equal(effectiveAiLimit("admin", { status: "active", tier: "starter" }, null), null);
  assert.equal(effectiveAiLimit("owner", { status: "active", tier: "business" }, 50), 100);
  assert.equal(effectiveAiLimit("owner", { status: "manual", tier: "starter" }, 50), 50);
  assert.equal(effectiveAiLimit("staff", null, 50), 50);
});

test("compare rows render for every tier", () => {
  for (const row of COMPARE_ROWS) {
    for (const t of ["starter", "business", "commerce"]) {
      const v = row.value(planFeatures(t));
      assert.ok(typeof v === "string" || typeof v === "boolean", row.label);
    }
  }
});
