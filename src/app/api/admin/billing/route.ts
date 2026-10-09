import { NextResponse } from "next/server";

import { DAY_MS } from "@/lib/billing/subscriptionState";
import { SUB_COLUMNS, type SubscriptionRow } from "@/lib/billing/subscriptions.server";
import { isTier, monthlyEquivalentKobo, type Interval } from "@/lib/marketing/pricing";
import { supabaseService } from "@/lib/supabase/admin.server";
import { requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const DOMAIN_STATUSES = ["requested", "quoted", "paid", "active", "rejected"];

export async function GET(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const db = supabaseService();
  const [subs, plans, domains] = await Promise.all([
    db.from("site_subscriptions").select(SUB_COLUMNS).neq("status", "manual").order("created_at", { ascending: false }).limit(2000),
    db.from("billing_plans").select("id, price_kobo, interval"),
    db.from("domain_requests").select("*").neq("status", "rejected").order("created_at", { ascending: false }),
  ]);
  if (subs.error) return json({ error: subs.error.message }, 500);
  const siteIds = ((subs.data ?? []) as unknown as SubscriptionRow[]).map((s) => s.site_id);
  const [sites, profiles] = siteIds.length
    ? await Promise.all([
        db.from("sites").select("id, slug").in("id", siteIds),
        db.from("business_profiles").select("site_id, business_name").in("site_id", siteIds),
      ])
    : [{ data: [] }, { data: [] }];
  const slugBy = new Map((sites.data ?? []).map((s) => [s.id as string, s.slug as string]));
  const nameBy = new Map((profiles.data ?? []).map((p) => [p.site_id as string, p.business_name as string]));
  const planBy = new Map((plans.data ?? []).map((p) => [p.id as string, p]));
  let mrrKobo = 0;
  const rows = ((subs.data ?? []) as unknown as SubscriptionRow[]).map((s) => {
    const plan = s.plan_id ? planBy.get(s.plan_id) : undefined;
    if (plan && ["active", "past_due", "cancelling"].includes(s.status)) {
      mrrKobo += monthlyEquivalentKobo(Number(plan.price_kobo), plan.interval as Interval);
    }
    return { ...s, slug: slugBy.get(s.site_id) ?? null, business_name: nameBy.get(s.site_id) ?? null };
  });
  return json({ rows, mrrKobo, domainRequests: domains.data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.action !== "string") return json({ error: "Missing action." }, 400);
  const db = supabaseService();

  if (b.action === "domain") {
    if (typeof b.id !== "string") return json({ error: "Missing id." }, 400);
    const patch: Record<string, unknown> = {};
    if (typeof b.status === "string") {
      if (!DOMAIN_STATUSES.includes(b.status)) return json({ error: "Bad status." }, 400);
      patch.status = b.status;
    }
    if (typeof b.renews_at === "string") {
      patch.renews_at = b.renews_at || null;
      patch.renewal_reminded_at = null;
    }
    if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 2000);
    const { error } = await db.from("domain_requests").update(patch).eq("id", b.id);
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  const siteId = typeof b.siteId === "string" ? b.siteId : "";
  if (!siteId) return json({ error: "Missing siteId." }, 400);
  const { data: current } = await db.from("site_subscriptions").select("status, trial_ends_at").eq("site_id", siteId).maybeSingle();
  const restore = async () => {
    if (current?.status === "archived") await db.from("sites").update({ status: "published" }).eq("id", siteId).eq("status", "suspended");
  };

  let patch: Record<string, unknown>;
  switch (b.action) {
    case "set_tier":
      if (!isTier(b.tier)) return json({ error: "Bad tier." }, 400);
      patch = { tier: b.tier };
      break;
    case "set_manual":
      patch = { status: "manual", blocked: false, paused_at: null };
      break;
    case "extend_trial": {
      const days = Number(b.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return json({ error: "Days must be 1–30." }, 400);
      if (current && !["trialing", "paused", "archived"].includes(current.status as string)) {
        return json({ error: "Only trial, paused or archived sites can get trial days." }, 409);
      }
      const base = Math.max(Date.now(), current?.trial_ends_at ? Date.parse(current.trial_ends_at as string) : 0);
      patch = { status: "trialing", trial_ends_at: new Date(base + days * DAY_MS).toISOString(), paused_at: null };
      break;
    }
    case "allow":
      patch = { flagged: null, blocked: false };
      break;
    case "block":
      patch = { blocked: true };
      break;
    case "unblock":
      patch = { blocked: false };
      break;
    default:
      return json({ error: "Unknown action." }, 400);
  }

  const { error } = current
    ? await db.from("site_subscriptions").update(patch).eq("site_id", siteId)
    : await db.from("site_subscriptions").insert({ site_id: siteId, status: "manual", ...patch });
  if (error) return json({ error: error.code === "23505" ? "This owner already has a site on trial." : error.message }, error.code === "23505" ? 409 : 500);
  if (b.action === "set_manual" || b.action === "extend_trial") await restore();
  return json({ ok: true });
}
