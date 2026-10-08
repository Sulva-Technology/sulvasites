// Plan/billing gates for public and owner routes. Pure: relative imports only.
import type { CheckoutMode } from "../shop/checkoutMode.ts";
import { featuresForSite } from "./planFeatures.ts";
import { isLive, type SubSnapshot } from "./subscriptionState.ts";

/** Why a shop order must be refused, or null to allow it. `null` sub = no plan limits. */
export function shopGateMessage(sub: SubSnapshot | null, kind: "card" | "whatsapp", now: number): string | null {
  if (!sub) return null;
  if (!isLive(sub, now)) return "This shop isn't taking orders right now.";
  if (sub.status === "manual") return null;
  const f = featuresForSite(sub);
  if (f && !f.shop) return "Online ordering isn't included in this site's plan.";
  if (kind === "card" && sub.status === "trialing") {
    return "Card payments start once this shop's plan is active. Please order on WhatsApp.";
  }
  return null;
}

/** Contact forms and other visitor actions on a paused site. */
export function siteGateMessage(sub: SubSnapshot | null, now: number): string | null {
  if (!sub || isLive(sub, now)) return null;
  return "This site isn't accepting messages right now.";
}

export function staffGateMessage(sub: SubSnapshot | null, currentStaff: number): string | null {
  const f = featuresForSite(sub);
  if (!f || currentStaff < f.staffSeats) return null;
  return f.staffSeats === 0
    ? "Your plan doesn't include staff seats. Upgrade to Business to add staff."
    : `Your plan includes ${f.staffSeats} staff seats. Upgrade to add more.`;
}

/** The checkout mode a storefront may show under its plan; null = no shop on this plan. */
export function planCheckoutMode(
  mode: CheckoutMode,
  billing: { status: string | null; tier: string | null },
): CheckoutMode | null {
  if (!billing.status || billing.status === "manual") return mode;
  if (billing.tier !== "commerce") return null;
  if (billing.status === "trialing") return "whatsapp";
  return mode;
}
