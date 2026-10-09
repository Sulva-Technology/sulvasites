// Creates (or finds) the 12 Paystack plans from src/lib/marketing/pricing.ts and upserts public.billing_plans.
// Test mode first, live later (plan codes differ per mode — re-run with the live key when going live).
// Usage: node --env-file=.env.local --experimental-strip-types --no-warnings scripts/paystack-plans.mjs
import { INTERVALS, PLAN_INFO, TIERS, intervalPrice, planId } from "../src/lib/marketing/pricing.ts";

const secret = process.env.PAYSTACK_SECRET_KEY;
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || !supaUrl || !serviceKey) {
  console.error("Set PAYSTACK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
console.log(`Paystack mode: ${secret.startsWith("sk_live_") ? "LIVE" : "test"}`);

async function ps(path, init = {}) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== true) throw new Error(`${path}: ${body.message ?? res.status}`);
  return body;
}

const existing = new Map();
for (let page = 1; ; page++) {
  const body = await ps(`/plan?perPage=100&page=${page}`);
  for (const p of body.data) existing.set(p.name, p);
  if (body.data.length < 100) break;
}

const rows = [];
for (const tier of TIERS) {
  for (const interval of INTERVALS) {
    for (const launch of [true, false]) {
      const id = planId(tier, interval, launch);
      const amount = intervalPrice(tier, interval, launch) * 100;
      const name = `Sulva Sites ${PLAN_INFO[tier].name} ${interval}${launch ? " (launch)" : ""}`;
      let plan = existing.get(name);
      if (plan && plan.amount !== amount) {
        throw new Error(`Paystack plan "${name}" has amount ${plan.amount}, expected ${amount}. Fix or rename it in Paystack first.`);
      }
      if (!plan) plan = (await ps("/plan", { method: "POST", body: JSON.stringify({ name, interval, amount, currency: "NGN" }) })).data;
      rows.push({ id, tier, interval, price_kobo: amount, launch, paystack_plan_code: plan.plan_code, active: true });
      console.log(`${id.padEnd(28)} ${plan.plan_code}  ₦${amount / 100}`);
    }
  }
}

const res = await fetch(`${supaUrl}/rest/v1/billing_plans?on_conflict=id`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});
if (!res.ok) throw new Error(`billing_plans upsert failed: ${res.status} ${await res.text()}`);
console.log(`Upserted ${rows.length} billing_plans rows.`);
