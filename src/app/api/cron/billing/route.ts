import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { sendLifecycleEmail, sendSalesEmail } from "@/lib/billing/email.server";
import { disableSubscription } from "@/lib/billing/paystackBilling.server";
import { emailsDue } from "@/lib/billing/lifecycle";
import { DAY_MS, sweepStatus } from "@/lib/billing/subscriptionState";
import { SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { supabaseService } from "@/lib/supabase/admin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Best effort: stop an archived site's Paystack subscription so it cannot charge again. On success
 * the code is cleared, so a later plan checkout does not try (and fail) to disable it again.
 */
async function disableArchived(db: SupabaseClient, siteId: string, code: string): Promise<void> {
  try {
    const { data: secret, error } = await db.from("billing_secrets").select("email_token").eq("site_id", siteId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!secret?.email_token) {
      console.error("[billing] cron archive: no stored token to disable subscription", { site_id: siteId, code });
      return;
    }
    await disableSubscription(code, secret.email_token as string);
    const { error: clearErr } = await db
      .from("site_subscriptions")
      .update({ paystack_subscription_code: null })
      .eq("site_id", siteId)
      .eq("paystack_subscription_code", code);
    if (clearErr) console.error("[billing] cron archive: subscription code not cleared", { site_id: siteId, error: clearErr.message });
  } catch (err) {
    console.error("[billing] cron archive: subscription not disabled", { site_id: siteId, code, error: err instanceof Error ? err.message : "error" });
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseService();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data, error } = await db
    .from("site_subscriptions")
    .select(SUB_COLUMNS)
    .in("status", ["trialing", "past_due", "cancelling", "paused"])
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let swept = 0;
  let emailed = 0;
  for (const row of (data ?? []) as SubscriptionRow[]) {
    try {
      let sub = row;
      const next = sweepStatus(sub, now);
      if (next) {
        // Suspend the site before archiving: the cron never reloads an archived row, so a failed
        // suspend must leave the subscription unchanged for the next run to retry. A site that is
        // already suspended (e.g. by an admin) is left alone and not marked as billing-suspended.
        let suspendedNow = false;
        if (next === "archived") {
          const { data: suspended, error: siteErr } = await db
            .from("sites")
            .update({ status: "suspended" })
            .eq("id", sub.site_id)
            .neq("status", "suspended")
            .select("id");
          if (siteErr) {
            console.error("[billing] cron suspend site failed", { site_id: sub.site_id, error: siteErr.message });
            continue;
          }
          suspendedNow = !!suspended?.length;
        }
        const patch: Record<string, unknown> =
          next === "paused" ? { status: next, paused_at: nowIso }
            : next === "archived" && suspendedNow ? { status: next, suspended_by_billing: true }
              : { status: next };
        // Conditional on the old status so a webhook that landed meanwhile wins.
        const { data: updated, error: upErr } = await db
          .from("site_subscriptions")
          .update(patch)
          .eq("site_id", sub.site_id)
          .eq("status", sub.status)
          .select("site_id");
        if (upErr) console.error("[billing] cron status update failed", { site_id: sub.site_id, error: upErr.message });
        if (upErr || !updated?.length) {
          if (suspendedNow) {
            // Not archived after all: undo this run's suspend, but only if still suspended, so a reactivated site stays live.
            const { error: revertErr } = await db
              .from("sites")
              .update({ status: "published" })
              .eq("id", sub.site_id)
              .eq("status", "suspended");
            if (revertErr) console.error("[billing] cron unsuspend site failed", { site_id: sub.site_id, error: revertErr.message });
          }
          continue;
        }
        if (next === "archived" && sub.paystack_subscription_code) await disableArchived(db, sub.site_id, sub.paystack_subscription_code);
        sub = { ...sub, ...patch } as SubscriptionRow;
        swept++;
      }
      for (const key of emailsDue(sub, now)) {
        if (await sendLifecycleEmail(db, sub.site_id, key)) emailed++;
      }
    } catch (err) {
      console.error("[billing] cron row failed", { site_id: row.site_id, error: err instanceof Error ? err.message : "error" });
    }
  }

  const soon = new Date(now + 30 * DAY_MS).toISOString().slice(0, 10);
  const { data: domains, error: domErr } = await db
    .from("domain_requests")
    .select("id, site_id, desired_name, renews_at")
    .eq("status", "active")
    .lte("renews_at", soon)
    .is("renewal_reminded_at", null);
  if (domErr) console.error("[billing] cron domain query failed", { error: domErr.message });
  let domainReminders = 0;
  for (const d of domains ?? []) {
    const sent = await sendSalesEmail(
      `Domain renewal due: ${d.desired_name}`,
      `${d.desired_name} renews on ${d.renews_at}.\nSend the owner a payment link, renew it, then set the new renewal date in Admin → Billing.\nSite: ${d.site_id}`,
    );
    if (sent) {
      const { error: remErr } = await db.from("domain_requests").update({ renewal_reminded_at: nowIso }).eq("id", d.id);
      if (remErr) console.error("[billing] cron renewal mark failed", { domain_id: d.id, error: remErr.message });
      domainReminders++;
    }
  }

  return NextResponse.json({ swept, emailed, domainReminders });
}
