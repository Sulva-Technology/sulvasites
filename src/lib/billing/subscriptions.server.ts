import type { SupabaseClient } from "@supabase/supabase-js";

import type { Interval } from "@/lib/marketing/pricing";
import type { SubSnapshot, SubStatus } from "@/lib/billing/subscriptionState";

export type SubscriptionRow = SubSnapshot & {
  site_id: string;
  owner_id: string | null;
  interval: Interval;
  plan_id: string | null;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  flagged: string | null;
  emails_sent: string[];
  created_at: string;
};

export const SUB_COLUMNS =
  "site_id, owner_id, tier, interval, plan_id, status, trial_ends_at, current_period_end, grace_ends_at, paused_at, blocked, flagged, emails_sent, paystack_customer_code, paystack_subscription_code, created_at";

/** Service-role read. Null when the site has no row (legacy/manual) or migration 019 has not run. */
export async function loadSubscription(db: SupabaseClient, siteId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await db.from("site_subscriptions").select(SUB_COLUMNS).eq("site_id", siteId).maybeSingle();
  if (error) {
    if (error.code !== "42P01") console.error("[billing] loadSubscription failed", error.message);
    return null;
  }
  return (data as SubscriptionRow | null) ?? null;
}

export type OwnedSite = { siteId: string; slug: string; status: SubStatus; businessName: string | null; createdAt: string };

/** Sites this user owns, with billing status ("manual" when there is no subscription row). */
export async function listOwnedSites(db: SupabaseClient, userId: string): Promise<OwnedSite[]> {
  const { data: members, error } = await db.from("site_members").select("site_id").eq("user_id", userId).eq("role", "owner");
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.site_id as string);
  if (ids.length === 0) return [];
  const [subs, sites, profiles] = await Promise.all([
    db.from("site_subscriptions").select("site_id, status, created_at").in("site_id", ids),
    db.from("sites").select("id, slug, created_at").in("id", ids),
    db.from("business_profiles").select("site_id, business_name").in("site_id", ids),
  ]);
  if (sites.error) throw sites.error;
  const subBy = new Map((subs.data ?? []).map((s) => [s.site_id as string, s]));
  const nameBy = new Map((profiles.data ?? []).map((p) => [p.site_id as string, (p.business_name as string) ?? null]));
  return (sites.data ?? []).map((s) => {
    const sub = subBy.get(s.id as string);
    return {
      siteId: s.id as string,
      slug: s.slug as string,
      status: ((sub?.status as SubStatus | undefined) ?? "manual"),
      businessName: nameBy.get(s.id as string) ?? null,
      createdAt: (sub?.created_at as string | undefined) ?? (s.created_at as string),
    };
  });
}
