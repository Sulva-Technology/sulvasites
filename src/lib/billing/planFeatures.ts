// What each plan includes. Pure: relative imports only.
import { isTier, type Tier } from "../marketing/pricing.ts";

export type PlanFeatures = {
  badge: boolean;
  customDomain: boolean;
  businessData: boolean;
  insights: boolean;
  aiMonthly: number;
  staffSeats: number;
  shop: boolean;
};

const FEATURES: Record<Tier, PlanFeatures> = {
  starter: { badge: true, customDomain: false, businessData: false, insights: false, aiMonthly: 20, staffSeats: 0, shop: false },
  business: { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 100, staffSeats: 2, shop: false },
  commerce: { badge: false, customDomain: true, businessData: true, insights: true, aiMonthly: 200, staffSeats: 5, shop: true },
};

export function planFeatures(tier: Tier): PlanFeatures {
  return { ...FEATURES[tier] };
}

export type SubLike = { status: string; tier: string } | null | undefined;

/**
 * The features a site may use, or null when it has no plan limits
 * (no subscription row, an admin-managed `manual` site, or an unknown tier).
 */
export function featuresForSite(sub: SubLike): PlanFeatures | null {
  if (!sub || sub.status === "manual" || !isTier(sub.tier)) return null;
  const f = planFeatures(sub.tier);
  return sub.status === "trialing" ? { ...f, badge: true } : f;
}

/** Monthly Ask AI allowance: admins keep `fallback` (null = unlimited); plan sites use their tier. */
export function effectiveAiLimit(role: string, sub: SubLike, fallback: number | null): number | null {
  if (role === "admin") return fallback;
  const f = featuresForSite(sub);
  return f ? f.aiMonthly : fallback;
}

export type CompareRow = { label: string; value: (f: PlanFeatures) => string | boolean };

export const COMPARE_ROWS: CompareRow[] = [
  { label: "All 17 templates, pages and a blog", value: () => true },
  { label: "Contact form inbox with email alerts", value: () => true },
  { label: "Free yourname.sulvasites.sulvatech.com address", value: () => true },
  { label: "Connect a domain you own", value: (f) => f.customDomain },
  { label: "No “Built with Sulva Sites” badge", value: (f) => !f.badge },
  { label: "Owner dashboard: business data and insights", value: (f) => f.businessData },
  { label: "Ask AI edits per month", value: (f) => String(f.aiMonthly) },
  { label: "Staff seats", value: (f) => (f.staffSeats > 0 ? String(f.staffSeats) : false) },
  { label: "Online shop or food ordering (Paystack + WhatsApp)", value: (f) => f.shop },
];
