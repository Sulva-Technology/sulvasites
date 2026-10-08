import { cache } from "react";

import { supabaseServer } from "@/lib/supabase/server";

export type SiteBillingState = { live: boolean; badge: boolean; tier: string | null; status: string | null };

const OPEN: SiteBillingState = { live: true, badge: false, tier: null, status: null };

/**
 * Billing state for public rendering via the site_billing_state RPC (anon-callable).
 * Fails open: no row, missing migration or any error => live, no badge.
 */
export const getSiteBillingState = cache(async (siteId: string): Promise<SiteBillingState> => {
  try {
    const { data, error } = await supabaseServer().rpc("site_billing_state", { p_site: siteId });
    if (error) {
      if (error.code !== "PGRST202" && error.code !== "42883") console.error("[billing] site_billing_state failed", error.message);
      return OPEN;
    }
    const row = (Array.isArray(data) ? data[0] : data) as Partial<SiteBillingState> | null | undefined;
    if (!row) return OPEN;
    return { live: row.live !== false, badge: row.badge === true, tier: row.tier ?? null, status: row.status ?? null };
  } catch {
    return OPEN;
  }
});
