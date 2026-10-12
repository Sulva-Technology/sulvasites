// The 12 Paystack plans (3 tiers × 2 intervals × launch/standard) from the pricing config.
// Shared by the admin "Set up plans" button and scripts/paystack-plans.mjs. Relative imports only.
import { INTERVALS, PLAN_INFO, TIERS, intervalPrice, planId, type Interval, type Tier } from "../marketing/pricing.ts";

export type PlanRow = { id: string; tier: Tier; interval: Interval; price_kobo: number; launch: boolean; paystack_plan_code: string; active: boolean };
export type ExpectedPlan = Omit<PlanRow, "paystack_plan_code" | "active"> & { name: string };

export function expectedPlans(): ExpectedPlan[] {
  const out: ExpectedPlan[] = [];
  for (const tier of TIERS) {
    for (const interval of INTERVALS) {
      for (const launch of [true, false]) {
        out.push({
          id: planId(tier, interval, launch),
          tier,
          interval,
          launch,
          price_kobo: intervalPrice(tier, interval, launch) * 100,
          name: `Sulva Sites ${PLAN_INFO[tier].name} ${interval}${launch ? " (launch)" : ""}`,
        });
      }
    }
  }
  return out;
}

/** How many of the expected plans have a Paystack plan code at the right price. */
export function planReadiness(rows: Array<{ id: string; price_kobo: number | string; paystack_plan_code: string | null }>) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const expected = expectedPlans();
  const missing = expected.filter((p) => {
    const r = byId.get(p.id);
    return !r || !r.paystack_plan_code || Number(r.price_kobo) !== p.price_kobo;
  });
  return { ready: expected.length - missing.length, total: expected.length, missing: missing.map((p) => p.id) };
}

type PaystackPlan = { name: string; plan_code: string; amount: number };

/**
 * Finds or creates every plan in Paystack (matched by name; a wrong amount is an error, never a silent
 * change) and returns the billing_plans rows to upsert. Idempotent: running it twice creates nothing new.
 */
export async function syncPaystackPlans(secret: string, fetchImpl: typeof fetch = fetch): Promise<PlanRow[]> {
  async function ps(path: string, init: RequestInit = {}) {
    const res = await fetchImpl(`https://api.paystack.co${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    });
    const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: unknown };
    if (!res.ok || body.status !== true) throw new Error(`Paystack ${path}: ${body.message ?? res.status}`);
    return body.data;
  }

  const existing = new Map<string, PaystackPlan>();
  for (let page = 1; ; page++) {
    const data = (await ps(`/plan?perPage=100&page=${page}`)) as PaystackPlan[];
    for (const p of data) existing.set(p.name, p);
    if (data.length < 100) break;
  }

  const rows: PlanRow[] = [];
  for (const p of expectedPlans()) {
    let plan = existing.get(p.name);
    if (plan && plan.amount !== p.price_kobo) {
      throw new Error(`Paystack plan "${p.name}" costs ${plan.amount / 100}, expected ${p.price_kobo / 100}. Fix or rename it in Paystack first.`);
    }
    if (!plan) {
      plan = (await ps("/plan", { method: "POST", body: JSON.stringify({ name: p.name, interval: p.interval, amount: p.price_kobo, currency: "NGN" }) })) as PaystackPlan;
    }
    rows.push({ id: p.id, tier: p.tier, interval: p.interval, price_kobo: p.price_kobo, launch: p.launch, paystack_plan_code: plan.plan_code, active: true });
  }
  return rows;
}
