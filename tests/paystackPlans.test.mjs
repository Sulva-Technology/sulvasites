import { test } from "node:test";
import assert from "node:assert/strict";

import { expectedPlans, planReadiness, syncPaystackPlans } from "../src/lib/billing/paystackPlans.ts";

/** A fake Paystack: lists `existing`, records created plans. */
function fakePaystack(existing = []) {
  const created = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      const plan = { ...body, plan_code: `PLN_new${created.length}` };
      created.push(plan);
      return new Response(JSON.stringify({ status: true, data: plan }), { status: 200 });
    }
    assert.equal(u.pathname, "/plan");
    return new Response(JSON.stringify({ status: true, data: existing }), { status: 200 });
  };
  return { fetchImpl, created };
}

test("12 plans: 3 tiers × 2 intervals × launch/standard, priced in kobo", () => {
  const plans = expectedPlans();
  assert.equal(plans.length, 12);
  assert.equal(new Set(plans.map((p) => p.id)).size, 12);
  for (const p of plans) assert.ok(p.price_kobo > 0 && p.price_kobo % 100 === 0, p.id);
});

test("sync creates missing plans and reuses ones that already exist", async () => {
  const [first] = expectedPlans();
  const { fetchImpl, created } = fakePaystack([{ name: first.name, plan_code: "PLN_old", amount: first.price_kobo }]);
  const rows = await syncPaystackPlans("sk_test_x", fetchImpl);
  assert.equal(rows.length, 12);
  assert.equal(created.length, 11);
  assert.equal(rows.find((r) => r.id === first.id).paystack_plan_code, "PLN_old");
  assert.ok(rows.every((r) => r.paystack_plan_code && r.active));
  assert.deepEqual(planReadiness(rows), { ready: 12, total: 12, missing: [] });
});

test("a Paystack plan at the wrong price stops the sync instead of charging the wrong amount", async () => {
  const [first] = expectedPlans();
  const { fetchImpl, created } = fakePaystack([{ name: first.name, plan_code: "PLN_old", amount: first.price_kobo + 100 }]);
  await assert.rejects(syncPaystackPlans("sk_test_x", fetchImpl), /expected/);
  assert.equal(created.length, 0);
});

test("readiness counts missing codes and changed prices as not ready", () => {
  const plans = expectedPlans();
  assert.deepEqual(planReadiness([]).ready, 0);
  const rows = plans.map((p) => ({ id: p.id, price_kobo: p.price_kobo, paystack_plan_code: "PLN" }));
  rows[0].paystack_plan_code = null;
  rows[1].price_kobo = 1;
  const r = planReadiness(rows);
  assert.equal(r.ready, 10);
  assert.deepEqual(r.missing, [plans[0].id, plans[1].id]);
});
