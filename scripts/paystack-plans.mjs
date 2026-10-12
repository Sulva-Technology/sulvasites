// Creates (or finds) the 12 Paystack plans from src/lib/marketing/pricing.ts and upserts public.billing_plans.
// Test mode first, live later (plan codes differ per mode — re-run with the live key when going live).
// The same thing runs from /admin/billing ("Set up plans now") with the production keys, no local setup needed.
// Usage: node --env-file=.env.local --experimental-strip-types --no-warnings scripts/paystack-plans.mjs
import { syncPaystackPlans } from "../src/lib/billing/paystackPlans.ts";

const secret = process.env.PAYSTACK_SECRET_KEY;
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || !supaUrl || !serviceKey) {
  console.error("Set PAYSTACK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
console.log(`Paystack mode: ${secret.startsWith("sk_live_") ? "LIVE" : "test"}`);

const rows = await syncPaystackPlans(secret);
for (const r of rows) console.log(`${r.id.padEnd(28)} ${r.paystack_plan_code}  ₦${r.price_kobo / 100}`);

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
