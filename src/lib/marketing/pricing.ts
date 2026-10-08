// Single source of truth for Sulva Sites plans and prices (naira). Pure: relative imports only.

export type Tier = "starter" | "business" | "commerce";
export type Interval = "monthly" | "annually";

export const TIERS: readonly Tier[] = ["starter", "business", "commerce"];
export const INTERVALS: readonly Interval[] = ["monthly", "annually"];
export const TRIAL_DAYS = 7;

/** Launch pricing ends at the end of this day, Lagos time (launch date + 6 months). */
export const PROMO_ENDS_AT = "2027-04-08T23:59:59+01:00";

export type PlanInfo = { name: string; blurb: string; standardMonthly: number; standardSetup: number };

export const PLAN_INFO: Record<Tier, PlanInfo> = {
  starter: {
    name: "Starter",
    blurb: "A beautiful site with pages, a blog and a contact inbox.",
    standardMonthly: 10_000,
    standardSetup: 150_000,
  },
  business: {
    name: "Business",
    blurb: "Your own domain, the owner dashboard and Ask AI.",
    standardMonthly: 20_000,
    standardSetup: 300_000,
  },
  commerce: {
    name: "Commerce",
    blurb: "Sell online with Paystack card and WhatsApp checkout.",
    standardMonthly: 35_000,
    standardSetup: 450_000,
  },
};

/** We buy and manage the domain. Cost-based, never discounted. */
export const DOMAIN_ADDONS = [
  { tld: ".com", yearly: 25_000 },
  { tld: ".com.ng", yearly: 15_000 },
] as const;

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v);
}

export function isInterval(v: unknown): v is Interval {
  return typeof v === "string" && (INTERVALS as readonly string[]).includes(v);
}

export function isPromoActive(now: Date = new Date()): boolean {
  return now.getTime() <= Date.parse(PROMO_ENDS_AT);
}

/** A third of the standard price, rounded up to the nearest ₦500. */
export function launchMonthly(standardMonthly: number): number {
  return Math.ceil(standardMonthly / 3 / 500) * 500;
}

export function monthlyPrice(tier: Tier, launch: boolean): number {
  const std = PLAN_INFO[tier].standardMonthly;
  return launch ? launchMonthly(std) : std;
}

/** Annual = 10 × monthly (two months free). */
export function intervalPrice(tier: Tier, interval: Interval, launch: boolean): number {
  const m = monthlyPrice(tier, launch);
  return interval === "annually" ? m * 10 : m;
}

/** One-time setup fee, done-for-you only. */
export function setupFee(tier: Tier, launch: boolean): number {
  const std = PLAN_INFO[tier].standardSetup;
  return launch ? Math.round(std / 3) : std;
}

export function planId(tier: Tier, interval: Interval, launch: boolean): string {
  return `${tier}-${interval}-${launch ? "launch" : "standard"}`;
}

export function parsePlanId(id: unknown): { tier: Tier; interval: Interval; launch: boolean } | null {
  if (typeof id !== "string") return null;
  const parts = id.split("-");
  if (parts.length !== 3) return null;
  const [tier, interval, kind] = parts;
  if (!isTier(tier) || !isInterval(interval) || (kind !== "launch" && kind !== "standard")) return null;
  return { tier, interval, launch: kind === "launch" };
}

export type OfferedPlan = { id: string; tier: Tier; interval: Interval; launch: boolean; price: number; standardPrice: number };

/** The plans a new subscription can pick right now (launch prices while the promo runs). */
export function offeredPlans(now: Date = new Date()): OfferedPlan[] {
  const launch = isPromoActive(now);
  const out: OfferedPlan[] = [];
  for (const tier of TIERS) {
    for (const interval of INTERVALS) {
      out.push({
        id: planId(tier, interval, launch),
        tier,
        interval,
        launch,
        price: intervalPrice(tier, interval, launch),
        standardPrice: intervalPrice(tier, interval, false),
      });
    }
  }
  return out;
}

export function monthlyEquivalentKobo(priceKobo: number, interval: Interval): number {
  return interval === "annually" ? Math.round(priceKobo / 12) : priceKobo;
}

export function formatNaira(n: number): string {
  const whole = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₦${whole}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "8 Apr 2027" — the promo end date in Lagos time (UTC+1, no DST). */
export function promoEndLabel(): string {
  const d = new Date(Date.parse(PROMO_ENDS_AT) + 60 * 60 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
