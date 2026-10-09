import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSubscription, disableSubscription } from "@/lib/billing/paystackBilling.server";
import { canTransition, DAY_MS, GRACE_DAYS, type SubStatus } from "@/lib/billing/subscriptionState";
import { loadSubscription, SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { addInterval, parseBillingEvent, subscriptionStartDate, type BillingEvent } from "@/lib/billing/webhookEvents";
import type { Interval } from "@/lib/marketing/pricing";

type FirstCharge = Extract<BillingEvent, { kind: "first_charge" }>;
type SubEvent = Exclude<BillingEvent, { kind: "ignore" } | { kind: "first_charge" }>;
export type SettleResult = "settled" | "already" | "unknown" | "mismatch" | "error";

const NO_STORE = { "Cache-Control": "no-store" };

/** Platform webhook → billing. 5xx makes Paystack retry; everything else is acknowledged. */
export async function handleBillingWebhook(db: SupabaseClient, event: unknown): Promise<NextResponse> {
  let kind = "unparsed";
  try {
    const ev = parseBillingEvent(event);
    kind = ev.kind;
    if (ev.kind === "ignore") return NextResponse.json({ ok: true, ignored: "event" }, { headers: NO_STORE });
    const result = ev.kind === "first_charge" ? await settleFirstCharge(db, ev) : await applySubscriptionEvent(db, ev);
    if (result === "error") return NextResponse.json({ error: "Billing webhook failed" }, { status: 500, headers: NO_STORE });
    return NextResponse.json({ ok: true, result }, { headers: NO_STORE });
  } catch (err) {
    console.error("[billing] webhook failed", { kind, error: err instanceof Error ? err.message : "error" });
    return NextResponse.json({ error: "Billing webhook failed" }, { status: 500, headers: NO_STORE });
  }
}

/**
 * First payment for a plan (new subscription or plan change). Used by the webhook and by the
 * callback verify path; the pending → paid claim makes it run once.
 */
export async function settleFirstCharge(db: SupabaseClient, ev: FirstCharge): Promise<SettleResult> {
  const { data: pending, error } = await db
    .from("billing_events")
    .select("id, site_id, plan_id, amount_kobo, status")
    .eq("event_key", ev.reference)
    .maybeSingle();
  if (error) return "error";
  if (!pending?.site_id || !pending.plan_id) return "unknown";
  if (pending.status === "paid") return "already";
  if (pending.status !== "pending") return "unknown";

  const { data: plan } = await db
    .from("billing_plans")
    .select("id, tier, interval, price_kobo, paystack_plan_code")
    .eq("id", pending.plan_id)
    .maybeSingle();
  if (!plan) return "unknown";
  if (ev.currency !== "NGN" || ev.amountKobo !== Number(plan.price_kobo) || ev.amountKobo !== Number(pending.amount_kobo)) {
    await db.from("billing_events").update({ status: "mismatch", summary: { amount_kobo: ev.amountKobo, currency: ev.currency } }).eq("id", pending.id);
    return "mismatch";
  }

  const { data: claimed, error: claimErr } = await db
    .from("billing_events")
    .update({ status: "paid", summary: { paid_at: new Date().toISOString() } })
    .eq("id", pending.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return "error";
  if (!claimed?.length) return "already";
  const unclaim = async () => {
    await db.from("billing_events").update({ status: "pending" }).eq("id", pending.id);
  };

  const siteId = pending.site_id as string;
  const interval = plan.interval as Interval;
  const sub = await loadSubscription(db, siteId);
  const paidThrough = sub && ["active", "cancelling", "past_due"].includes(sub.status) ? sub.current_period_end : null;
  const periodEnd = subscriptionStartDate(new Date(), sub?.trial_ends_at ?? null, paidThrough, interval);

  let newCode: string | null = null;
  let emailToken: string | null = null;
  let problem: string | null = null;
  if (ev.reusable && ev.authorizationCode && ev.customerCode && plan.paystack_plan_code) {
    try {
      const created = await createSubscription({
        customer: ev.customerCode,
        plan: plan.paystack_plan_code as string,
        authorization: ev.authorizationCode,
        startDate: periodEnd,
      });
      newCode = created.subscription_code;
      emailToken = created.email_token;
    } catch (err) {
      problem = "renewal_setup_failed";
      console.error("[billing] create subscription failed", { siteId, error: err instanceof Error ? err.message : "error" });
    }
  } else {
    problem = "card_not_reusable";
  }

  const oldCode = sub?.paystack_subscription_code ?? null;
  const { data: oldSecret } = oldCode
    ? await db.from("billing_secrets").select("email_token").eq("site_id", siteId).maybeSingle()
    : { data: null };

  // Without a renewing Paystack subscription the paid period still counts, then the site pauses.
  const patch = {
    tier: plan.tier,
    interval,
    plan_id: plan.id,
    status: newCode ? "active" : "cancelling",
    current_period_end: periodEnd.toISOString(),
    trial_ends_at: null,
    grace_ends_at: null,
    paused_at: null,
    paystack_customer_code: ev.customerCode,
    paystack_subscription_code: newCode,
    flagged: problem ?? sub?.flagged ?? null,
  };
  const { error: writeErr } = sub
    ? await db.from("site_subscriptions").update(patch).eq("site_id", siteId)
    : await db.from("site_subscriptions").insert({ ...patch, site_id: siteId });
  if (writeErr) {
    console.error("[billing] subscription write failed", writeErr.message);
    // The Paystack subscription exists already; disable it so the retry does not orphan a live one.
    if (newCode && emailToken) {
      await disableSubscription(newCode, emailToken).catch((err) =>
        console.error("[billing] new subscription not disabled after failed write", { newCode, error: err instanceof Error ? err.message : "error" }),
      );
    }
    await unclaim();
    return "error";
  }

  const flag = async (reason: string) => {
    await db.from("site_subscriptions").update({ flagged: reason }).eq("site_id", siteId);
  };
  // The payment is real, so a failure here flags the site for follow-up instead of failing the settle.
  const { error: secretErr } = await db
    .from("billing_secrets")
    .upsert({ site_id: siteId, authorization_code: ev.authorizationCode, email_token: emailToken, updated_at: new Date().toISOString() });
  if (secretErr) {
    console.error("[billing] billing secret not saved", { siteId, error: secretErr.message });
    await flag("billing_secret_not_saved");
  }
  if (sub?.status === "archived") {
    await db.from("sites").update({ status: "published" }).eq("id", siteId).eq("status", "suspended");
  }
  // Disable the old Paystack subscription only now: the row points at the new code, so its disable webhook is ignored.
  if (oldCode && oldCode !== newCode) {
    let disabled = false;
    if (oldSecret?.email_token) {
      try {
        await disableSubscription(oldCode, oldSecret.email_token as string);
        disabled = true;
      } catch (err) {
        console.error("[billing] old subscription not disabled", { oldCode, error: err instanceof Error ? err.message : "error" });
      }
    } else {
      console.error("[billing] old subscription has no stored token", { oldCode });
    }
    if (!disabled) await flag("old_subscription_not_disabled");
  }
  return "settled";
}

export async function applySubscriptionEvent(db: SupabaseClient, ev: SubEvent): Promise<string> {
  const { data: seen, error: seenErr } = await db.from("billing_events").select("id").eq("event_key", ev.key).maybeSingle();
  if (seenErr) return "error";
  if (seen) return "already";

  const { data: row, error } = await db
    .from("site_subscriptions")
    .select(SUB_COLUMNS)
    .eq("paystack_subscription_code", ev.subscriptionCode)
    .maybeSingle();
  if (error) return "error";
  if (!row) {
    // A paid renewal we cannot attach to a site needs a human; other unknown events are ignored.
    if (ev.kind === "invoice_paid") {
      const { error: unkErr } = await db.from("billing_events").insert({
        event_key: ev.key,
        kind: "invoice_paid_unknown",
        site_id: null,
        amount_kobo: ev.amountKobo,
        status: "needs_attention",
        summary: { subscription_code: ev.subscriptionCode },
      });
      if (unkErr && unkErr.code !== "23505") return "error";
    }
    return "unknown_subscription";
  }
  const sub = row as SubscriptionRow;
  const now = new Date();

  let patch: Record<string, unknown>;
  switch (ev.kind) {
    case "invoice_paid":
      patch = {
        status: "active",
        current_period_end: ev.nextPaymentDate ?? addInterval(now, sub.interval).toISOString(),
        grace_ends_at: null,
        paused_at: null,
      };
      break;
    case "payment_failed":
      patch = { status: "past_due", grace_ends_at: new Date(now.getTime() + GRACE_DAYS * DAY_MS).toISOString() };
      break;
    case "not_renew":
      patch = { status: "cancelling" };
      break;
    case "disabled": {
      const stillPaid = !!sub.current_period_end && Date.parse(sub.current_period_end) > now.getTime();
      patch = stillPaid ? { status: "cancelling" } : { status: "paused", paused_at: now.toISOString() };
      break;
    }
  }
  const next = patch.status as SubStatus;
  const allowed = next === sub.status || canTransition(sub.status, next);
  if (allowed) {
    const { error: upErr } = await db.from("site_subscriptions").update(patch).eq("site_id", sub.site_id);
    if (upErr) return "error";
  }
  const { error: insErr } = await db.from("billing_events").insert({
    event_key: ev.key,
    kind: ev.kind,
    site_id: sub.site_id,
    amount_kobo: ev.kind === "invoice_paid" ? ev.amountKobo : null,
    status: allowed ? "done" : "skipped",
  });
  if (insErr && insErr.code !== "23505") return "error";
  return allowed ? "applied" : "skipped";
}
