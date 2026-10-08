import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

import { planCheckoutMode } from "@/lib/billing/gates";
import { getSiteBillingState } from "@/lib/billing/siteState.server";

import { mapShopRows } from "./mapShopRows";
import type { ShopData } from "./types";

/** Anon (RLS-enforced) client: only public catalogue rows of published sites with the shop enabled. */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Public storefront data for a site, or null when the shop is disabled / the site is unpublished
 * (RLS hides the settings row in both cases) or the catalogue can't be read. Cached per request so
 * generateMetadata and the page share one round of queries.
 */
export const loadPublicShop = cache(async (siteId: string): Promise<ShopData | null> => {
  try {
    const db = anonClient();

    const base = "enabled, delivery_fee_kobo, pickup_enabled, pickup_note";
    let { data: settings, error: sErr } = await db
      .from("shop_settings")
      .select(`${base}, checkout_mode, whatsapp_orders_number`)
      .eq("site_id", siteId)
      .maybeSingle<Record<string, unknown>>();
    // Before migration 018 runs the new columns don't exist; fall back so shops stay up.
    if (sErr?.code === "42703") {
      ({ data: settings, error: sErr } = await db
        .from("shop_settings")
        .select(base)
        .eq("site_id", siteId)
        .maybeSingle<Record<string, unknown>>());
    }
    if (sErr || !settings || settings.enabled !== true) return null;

    const [cats, prods, vars] = await Promise.all([
      db.from("product_categories").select("id, name, slug, position").eq("site_id", siteId).order("position"),
      db
        .from("products")
        .select("id, category_id, name, slug, description, images, price_kobo, compare_at_kobo, featured, position")
        .eq("site_id", siteId)
        .eq("active", true)
        .order("position")
        .order("created_at"),
      db
        .from("product_variants")
        .select("id, product_id, options, price_kobo, stock, sku, position")
        .eq("site_id", siteId)
        .order("position"),
    ]);
    if (cats.error || prods.error || vars.error) return null;

    const shop = mapShopRows({
      siteId,
      settings,
      categories: (cats.data ?? []) as Record<string, unknown>[],
      products: (prods.data ?? []) as Record<string, unknown>[],
      variants: (vars.data ?? []) as Record<string, unknown>[],
    });
    // Plan limits: no shop below Commerce; WhatsApp-only while trialing.
    const mode = planCheckoutMode(shop.settings.checkoutMode, await getSiteBillingState(siteId));
    if (mode === null) return null;
    return { ...shop, settings: { ...shop.settings, checkoutMode: mode } };
  } catch (err) {
    console.error("[shop] loadPublicShop failed", { error: err instanceof Error ? err.message : "error" });
    return null;
  }
});
