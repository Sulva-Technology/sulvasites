import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLifecycleEmail, emailKind } from "@/lib/billing/lifecycle";
import { daysLeft } from "@/lib/billing/subscriptionState";
import { loadSubscription } from "@/lib/billing/subscriptions.server";
import { isNotifiable, sendResend } from "@/lib/inbox/notify";

function platformDomain(): string {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").trim().toLowerCase();
}

/** Origin of the platform app (dashboard, billing pages). */
export function platformOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || `https://${platformDomain()}`).replace(/\/+$/, "");
}

function resend() {
  return { apiKey: process.env.RESEND_API_KEY?.trim() || null, from: process.env.RESEND_FROM?.trim() || null };
}

/** Sends one lifecycle email to the site's owner and records the key in emails_sent. Never throws. */
export async function sendLifecycleEmail(db: SupabaseClient, siteId: string, key: string): Promise<boolean> {
  try {
    const kind = emailKind(key);
    if (!kind) return false;
    const { data: owner } = await db.from("site_members").select("user_id").eq("site_id", siteId).eq("role", "owner").limit(1).maybeSingle();
    if (!owner) return false;
    const { data: u } = await db.auth.admin.getUserById(owner.user_id as string);
    const to = u.user?.email ?? null;
    const cfg = { ...resend(), to };
    if (!isNotifiable(cfg)) return false;

    const [{ data: site }, { data: profile }, sub] = await Promise.all([
      db.from("sites").select("slug").eq("id", siteId).maybeSingle(),
      db.from("business_profiles").select("business_name").eq("site_id", siteId).maybeSingle(),
      loadSubscription(db, siteId),
    ]);
    if (!site?.slug) return false;
    const mail = buildLifecycleEmail(kind, {
      businessName: (profile?.business_name as string | undefined) || (site.slug as string),
      siteUrl: `https://${site.slug}.${platformDomain()}`,
      billingUrl: `${platformOrigin()}/dashboard/${siteId}/billing`,
      daysLeft: daysLeft(sub?.trial_ends_at ?? null, Date.now()),
    });
    const ok = await sendResend({ apiKey: cfg.apiKey!, from: cfg.from!, to: to! }, mail);
    if (ok && sub) {
      await db.from("site_subscriptions").update({ emails_sent: [...sub.emails_sent, key] }).eq("site_id", siteId);
    }
    return ok;
  } catch (err) {
    console.error("[billing] lifecycle email failed", { siteId, key, error: err instanceof Error ? err.message : "error" });
    return false;
  }
}

/** Plain notification to Sulvatech (leads, domain requests). Never throws. */
export async function sendSalesEmail(subject: string, text: string): Promise<boolean> {
  const cfg = { ...resend(), to: process.env.SALES_NOTIFY_EMAIL?.trim() || null };
  if (!isNotifiable(cfg)) return false;
  const html = `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;
  return sendResend({ apiKey: cfg.apiKey!, from: cfg.from!, to: cfg.to! }, { subject: subject.slice(0, 200), text, html });
}
