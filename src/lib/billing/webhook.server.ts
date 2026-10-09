import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSubscription, disableSubscription } from "@/lib/billing/paystackBilling.server";
import { canTransition, DAY_MS, GRACE_DAYS, type SubStatus } from "@/lib/billing/subscriptionState";
import { loadSubscription, restoreBillingSuspension, SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { addInterval, parseBillingEvent, subscriptionStartDate, type BillingEvent } from "@/lib/billing/webhookEvents";
import type { Interval } from "@/lib/marketing/pricing";

type FirstCharge = Extract<BillingEvent, { kind: "first_charge" }>;
type SubEvent = Exclude<BillingEvent, { kind: "ignore" } | { kind: "first_charge" }>;
/** "busy": another run holds a fresh settling claim; the webhook answers 503 so Paystack retries later. */
export type SettleResult = "settled" | "already" | "busy" | "unknown" | "mismatch" | "error";

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
    if (result === "busy") return NextResponse.json({ error: "Billing settle in progress" }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ ok: true, result }, { headers: NO_STORE });
  } catch (err) {
    console.error("[billing] webhook failed", { kind, error: err instanceof Error ? err.message : "error" });
    return NextResponse.json({ error: "Billing webhook failed" }, { status: 500, headers: NO_STORE });
  }
}

/** A `settling` claim older than this belongs to a function that died (routes run at most 60 s). */
const STALE_CLAIM_MS = 5 * 60_000;

/**
 * Whether the site's current Paystack subscription may still charge, so a plan change must disable it.
 * Cancelling ones were already stopped (owner cancel, not_renew, disable). A paused/archived one is
 * live only if it paused after a failed payment (grace_ends_at kept), when Paystack may still retry.
 */
function mayStillCharge(sub: SubscriptionRow | null): boolean {
  if (!sub?.paystack_subscription_code) return false;
  if (sub.status === "cancelling") return false;
  if (sub.status === "paused" || sub.status === "archived") return !!sub.grace_ends_at;
  return true;
}

/**
 * First payment for a plan (new subscription or plan change). Used by the webhook and by the
 * callback verify path. The pending → settling claim makes it run once; `paid` is set only at the
 * end. A `settling` claim older than STALE_CLAIM_MS may be reclaimed: if that run had already
 * written the subscription (summary.written_at) the settle is just finished, otherwise it reruns.
 */
export async function settleFirstCharge(db: SupabaseClient, ev: FirstCharge): Promise<SettleResult> {
  const { data: pending, error } = await db
    .from("billing_events")
    .select("id, site_id, plan_id, amount_kobo, status, summary")
    .eq("event_key", ev.reference)
    .maybeSingle();
  if (error) return "error";
  if (!pending?.site_id || !pending.plan_id) return "unknown";
  if (pending.status === "paid") return "already";
  const prev = (pending.summary ?? {}) as { claimed_at?: string; subscription_code?: string | null; written_at?: string };
  if (pending.status === "settling") {
    const claimedAt = Date.parse(prev.claimed_at ?? "");
    if (Number.isFinite(claimedAt) && Date.now() - claimedAt < STALE_CLAIM_MS) return "busy";
  } else if (pending.status !== "pending") {
    return "unknown";
  }

  const { data: plan } = await db
    .from("billing_plans")
    .select("id, tier, interval, price_kobo, paystack_plan_code")
    .eq("id", pending.plan_id)
    .maybeSingle();
  if (!plan) return "unknown";
  if (ev.currency !== "NGN" || ev.amountKobo !== Number(plan.price_kobo) || ev.amountKobo !== Number(pending.amount_kobo)) {
    await db
      .from("billing_events")
      .update({ status: "mismatch", summary: { amount_kobo: ev.amountKobo, currency: ev.currency } })
      .eq("id", pending.id)
      .eq("status", pending.status);
    return "mismatch";
  }

  // Claim (or reclaim a stale claim, conditional on the old claimed_at so only one retry wins).
  const claimedAt = new Date().toISOString();
  const resumeWritten = pending.status === "settling" && !!prev.written_at;
  let claim = db
    .from("billing_events")
    .update({ status: "settling", summary: resumeWritten ? { ...prev, claimed_at: claimedAt } : { claimed_at: claimedAt } })
    .eq("id", pending.id)
    .eq("status", pending.status);
  if (pending.status === "settling" && prev.claimed_at) claim = claim.eq("summary->>claimed_at", prev.claimed_at);
  const { data: claimed, error: claimErr } = await claim.select("id");
  if (claimErr) return "error";
  if (!claimed?.length) return "busy";
  const checkpoint = async (summary: Record<string, unknown>) => {
    const { error: cpErr } = await db.from("billing_events").update({ summary }).eq("id", pending.id).eq("status", "settling");
    if (cpErr) console.error("[billing] settle checkpoint failed", { reference: ev.reference, error: cpErr.message });
  };
  const unclaim = async () => {
    await db.from("billing_events").update({ status: "pending", summary: {} }).eq("id", pending.id);
  };
  const markPaid = async (summary: Record<string, unknown>): Promise<SettleResult> => {
    const { error: paidErr } = await db
      .from("billing_events")
      .update({ status: "paid", summary: { ...summary, paid_at: new Date().toISOString() } })
      .eq("id", pending.id)
      .eq("status", "settling");
    if (paidErr) {
      // The subscription is written (written_at), so a later retry only finishes the settle.
      console.error("[billing] settle not marked paid", { reference: ev.reference, error: paidErr.message });
      return "error";
    }
    return "settled";
  };

  const siteId = pending.site_id as string;
  const flag = async (reason: string) => {
    await db.from("site_subscriptions").update({ flagged: reason }).eq("site_id", siteId);
  };

  if (resumeWritten) {
    // The earlier run wrote the subscription and then died; its follow-ups may not have run.
    console.error("[billing] resuming interrupted settle", { reference: ev.reference, siteId });
    await restoreBillingSuspension(db, siteId);
    await flag("settle_interrupted_check_billing");
    return markPaid({ subscription_code: prev.subscription_code ?? null, resumed: true });
  }
  // An earlier run created a Paystack subscription it never recorded; it is flagged after the rerun.
  const orphanCode = pending.status === "settling" ? (prev.subscription_code ?? null) : null;

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
      await checkpoint({ claimed_at: claimedAt, subscription_code: newCode });
    } catch (err) {
      problem = "renewal_setup_failed";
      console.error("[billing] create subscription failed", { siteId, error: err instanceof Error ? err.message : "error" });
    }
  } else {
    problem = "card_not_reusable";
  }

  const oldCode = mayStillCharge(sub) ? (sub?.paystack_subscription_code ?? null) : null;
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
  await checkpoint({ claimed_at: claimedAt, subscription_code: newCode, written_at: new Date().toISOString() });

  // The payment is real, so a failure here flags the site for follow-up instead of failing the settle.
  const { error: secretErr } = await db
    .from("billing_secrets")
    .upsert({ site_id: siteId, authorization_code: ev.authorizationCode, email_token: emailToken, updated_at: new Date().toISOString() });
  if (secretErr) {
    console.error("[billing] billing secret not saved", { siteId, error: secretErr.message });
    await flag("billing_secret_not_saved");
  }
  await restoreBillingSuspension(db, siteId);
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
  if (orphanCode && orphanCode !== newCode) {
    console.error("[billing] interrupted settle left an unrecorded Paystack subscription", { siteId, orphanCode });
    await flag("orphan_subscription_check_paystack");
  }
  return markPaid({ subscription_code: newCode, ...(orphanCode && orphanCode !== newCode ? { orphan_subscription_code: orphanCode } : {}) });
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
      // The cron disables an archived site's subscription itself; that must not un-archive it.
      if (sub.status === "archived") {
        patch = { status: "archived" };
        break;
      }
      const stillPaid = !!sub.current_period_end && Date.parse(sub.current_period_end) > now.getTime();
      // grace_ends_at is cleared: a disabled subscription will not be retried (see mayStillCharge).
      patch = stillPaid ? { status: "cancelling", grace_ends_at: null } : { status: "paused", paused_at: now.toISOString(), grace_ends_at: null };
      break;
    }
  }
  const next = patch.status as SubStatus;
  const allowed = next === sub.status || canTransition(sub.status, next);
  if (allowed) {
    const { error: upErr } = await db.from("site_subscriptions").update(patch).eq("site_id", sub.site_id);
    if (upErr) return "error";
    if (ev.kind === "invoice_paid") await restoreBillingSuspension(db, sub.site_id);
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
