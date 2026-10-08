import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIERS, intervalPrice, isPromoActive, launchMonthly, monthlyPrice, monthlyEquivalentKobo,
  offeredPlans, parsePlanId, planId, promoEndLabel, setupFee, formatNaira, PROMO_ENDS_AT,
} from "../src/lib/marketing/pricing.ts";

test("launch monthly is a third, rounded up to the nearest 500", () => {
  assert.equal(launchMonthly(10_000), 3_500);
  assert.equal(launchMonthly(20_000), 7_000);
  assert.equal(launchMonthly(35_000), 12_000);
  assert.deepEqual(TIERS.map((t) => monthlyPrice(t, true)), [3_500, 7_000, 12_000]);
  assert.deepEqual(TIERS.map((t) => monthlyPrice(t, false)), [10_000, 20_000, 35_000]);
});

test("annual is ten months", () => {
  assert.equal(intervalPrice("starter", "annually", true), 35_000);
  assert.equal(intervalPrice("commerce", "annually", false), 350_000);
  assert.equal(intervalPrice("business", "monthly", true), 7_000);
});

test("setup fee is a third during launch", () => {
  assert.deepEqual(TIERS.map((t) => setupFee(t, true)), [50_000, 100_000, 150_000]);
  assert.deepEqual(TIERS.map((t) => setupFee(t, false)), [150_000, 300_000, 450_000]);
});

test("promo window is inclusive of the end instant", () => {
  const end = Date.parse(PROMO_ENDS_AT);
  assert.equal(isPromoActive(new Date(end)), true);
  assert.equal(isPromoActive(new Date(end + 1)), false);
  assert.equal(promoEndLabel(), "8 Apr 2027");
});

test("plan ids round-trip and reject junk", () => {
  assert.equal(planId("business", "annually", true), "business-annually-launch");
  assert.deepEqual(parsePlanId("starter-monthly-standard"), { tier: "starter", interval: "monthly", launch: false });
  assert.equal(parsePlanId("gold-monthly-launch"), null);
  assert.equal(parsePlanId("starter-weekly-launch"), null);
  assert.equal(parsePlanId("starter-monthly-launch-x"), null);
  assert.equal(parsePlanId(42), null);
});

test("offered plans use launch prices only while the promo runs", () => {
  const during = offeredPlans(new Date("2026-11-01T00:00:00Z"));
  assert.equal(during.length, 6);
  assert.ok(during.every((p) => p.launch));
  const starter = during.find((p) => p.tier === "starter" && p.interval === "monthly");
  assert.deepEqual(starter, { id: "starter-monthly-launch", tier: "starter", interval: "monthly", launch: true, price: 3_500, standardPrice: 10_000 });
  assert.ok(offeredPlans(new Date("2027-05-01T00:00:00Z")).every((p) => !p.launch));
});

test("formatting and MRR helpers", () => {
  assert.equal(formatNaira(3_500), "₦3,500");
  assert.equal(formatNaira(1_234_567), "₦1,234,567");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(monthlyEquivalentKobo(1_200_000, "annually"), 100_000);
  assert.equal(monthlyEquivalentKobo(350_000, "monthly"), 350_000);
});
