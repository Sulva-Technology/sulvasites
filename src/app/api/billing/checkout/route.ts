import { NextResponse } from "next/server";

import { platformOrigin } from "@/lib/billing/email.server";
import { initializeCheckout } from "@/lib/billing/paystackBilling.server";
import { newBillingReference } from "@/lib/billing/reference";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { isInterval, isPromoActive, isTier, planId } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { rateLimit } from "@/lib/supabase/requireAdmin.server";
import { requireSiteRole } from "@/lib/supabase/requireSiteRole.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { siteId?: unknown; tier?: unknown; interval?: unknown } | null;
  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  const auth = await requireSiteRole(req, siteId, ["owner"]);
  if (!auth.ok) return auth.response;
  const limited = rateLimit(`billing-checkout:${auth.userId}`, { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;
  if (!isTier(body?.tier) || !isInterval(body?.interval)) return json({ error: "Pick a plan." }, 400);
  if (!auth.email) return json({ error: "Your account has no email address." }, 400);

  const db = supabaseService();
  const sub = await loadSubscription(db, siteId);
  if (!sub || sub.status === "manual") return json({ error: "This site is billed by Sulvatech directly." }, 409);
  if (sub.blocked) return json({ error: "This site is on hold. Please contact Sulvatech." }, 403);

  const id = planId(body.tier, body.interval, isPromoActive());
  const { data: plan } = await db.from("billing_plans").select("id, price_kobo, paystack_plan_code").eq("id", id).maybeSingle();
  if (!plan?.paystack_plan_code) return json({ error: "Plans are not set up yet. Please try again later." }, 503);

  const reference = newBillingReference();
  const { error: pendErr } = await db.from("billing_events").insert({
    event_key: reference, kind: "checkout", site_id: siteId, plan_id: plan.id, amount_kobo: plan.price_kobo, status: "pending",
  });
  if (pendErr) return json({ error: "Could not start checkout." }, 500);

  try {
    const init = await initializeCheckout({
      email: auth.email,
      amountKobo: Number(plan.price_kobo),
      reference,
      callbackUrl: `${platformOrigin()}/dashboard/${siteId}/billing?ref=${reference}`,
      metadata: { kind: "subscription", siteId, planId: plan.id },
    });
    return json({ url: init.authorization_url });
  } catch (err) {
    console.error("[billing] initialize failed", err instanceof Error ? err.message : "error");
    return json({ error: "Could not reach Paystack. Please try again." }, 502);
  }
}
