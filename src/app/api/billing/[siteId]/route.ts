import { NextResponse } from "next/server";

import { sendSalesEmail } from "@/lib/billing/email.server";
import { disableSubscription, manageLink, verifyTransaction } from "@/lib/billing/paystackBilling.server";
import { isBillingReference } from "@/lib/billing/reference";
import { daysLeft, isLive } from "@/lib/billing/subscriptionState";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { settleFirstCharge } from "@/lib/billing/webhook.server";
import { parseBillingEvent } from "@/lib/billing/webhookEvents";
import { intervalPrice, isPromoActive, offeredPlans, parsePlanId, planId, type OfferedPlan } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ siteId: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * The prices checkout will charge: launch pricing while the promo runs, and for sites already on a
 * launch plan even after it ends (their launch price is kept).
 */
function plansFor(now: Date, currentPlanId: string | null | undefined): OfferedPlan[] {
  const plans = offeredPlans(now);
  if (isPromoActive(now) || !parsePlanId(currentPlanId)?.launch) return plans;
  return plans.map((p) => ({
    ...p,
    id: planId(p.tier, p.interval, true),
    launch: true,
    price: intervalPrice(p.tier, p.interval, true),
  }));
}

export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner", "admin"]);
  if (!auth.ok) return auth.response;
  const db = supabaseService();

  // Back from Paystack: settle now instead of waiting for the webhook.
  const ref = new URL(req.url).searchParams.get("verify");
  if (ref && isBillingReference(ref) && !rateLimit(`billing-verify:${auth.userId}`, { limit: 10, windowMs: 10 * 60_000 })) {
    try {
      const tx = await verifyTransaction(ref);
      if (tx.status === "success") {
        const ev = parseBillingEvent({ event: "charge.success", data: tx });
        if (ev.kind === "first_charge") await settleFirstCharge(db, ev);
      }
    } catch (err) {
      console.error("[billing] verify failed", err instanceof Error ? err.message : "error");
    }
  }

  const sub = await loadSubscription(db, siteId);
  const [events, domains] = await Promise.all([
    db.from("billing_events").select("kind, amount_kobo, status, plan_id, created_at").eq("site_id", siteId).neq("status", "pending").order("created_at", { ascending: false }).limit(20),
    db.from("domain_requests").select("desired_name, status, renews_at").eq("site_id", siteId).order("created_at", { ascending: false }),
  ]);
  const now = Date.now();
  return json({
    subscription: sub && {
      status: sub.status, tier: sub.tier, interval: sub.interval, plan_id: sub.plan_id,
      trial_ends_at: sub.trial_ends_at, current_period_end: sub.current_period_end,
      grace_ends_at: sub.grace_ends_at, hasCard: !!sub.paystack_subscription_code,
    },
    live: sub ? isLive(sub, now) : true,
    trialDaysLeft: sub ? daysLeft(sub.trial_ends_at, now) : 0,
    plans: plansFor(new Date(now), sub?.plan_id),
    events: events.data ?? [],
    domainRequests: domains.data ?? [],
    role: auth.role,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const auth = await requireSiteRole(req, siteId, ["owner"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`billing-action:${auth.userId}`, { limit: 20, windowMs: 10 * 60_000 });
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as { action?: string; desiredName?: string } | null;
  const db = supabaseService();
  const sub = await loadSubscription(db, siteId);

  if (body?.action === "domain") {
    const name = (body.desiredName ?? "").trim().toLowerCase();
    if (!DOMAIN_RE.test(name) || name.length > 100) return json({ error: "Enter a domain like yourbusiness.com.ng." }, 400);
    const { error } = await db.from("domain_requests").insert({ site_id: siteId, requested_by: auth.userId, desired_name: name });
    if (error) return json({ error: "Could not send your request." }, 500);
    await sendSalesEmail(`Domain add-on request: ${name}`, `Site: ${siteId}\nOwner: ${auth.email ?? auth.userId}\nDomain: ${name}`);
    return json({ ok: true });
  }

  if (!sub?.paystack_subscription_code) return json({ error: "There's no active card subscription on this site." }, 409);

  if (body?.action === "manage") {
    try {
      return json({ url: await manageLink(sub.paystack_subscription_code) });
    } catch {
      return json({ error: "Could not open card settings. Please try again." }, 502);
    }
  }

  if (body?.action === "cancel") {
    // A paused/archived/cancelling site has nothing renewing; cancelling it would only rewrite its status.
    if (!["active", "past_due"].includes(sub.status)) return json({ error: "There's no active subscription to cancel." }, 409);
    const { data: secret } = await db.from("billing_secrets").select("email_token").eq("site_id", siteId).maybeSingle();
    if (!secret?.email_token) return json({ error: "Could not cancel. Please contact Sulvatech." }, 500);
    try {
      await disableSubscription(sub.paystack_subscription_code, secret.email_token as string);
    } catch {
      return json({ error: "Could not reach Paystack. Please try again." }, 502);
    }
    const { error: updateError } = await db.from("site_subscriptions").update({ status: "cancelling" }).eq("site_id", siteId);
    if (updateError) {
      console.error("[billing] cancel status update failed", updateError.message);
      return json({ error: "Cancelled with Paystack, but we couldn't update your site. Please contact Sulvatech." }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}
