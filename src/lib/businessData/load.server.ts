import { cache } from "react";

import { isBusinessKind, type BusinessItemRow } from "./types";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Active business items for a site (public read: published sites only under RLS).
 * Fails soft: before migration 009 is applied, or on any error, returns [] so pages render their own content.
 */
export const loadBusinessItems = cache(async (siteId: string): Promise<BusinessItemRow[]> => {
  try {
    const { data, error } = await supabaseServer()
      .from("business_items")
      .select("id, site_id, kind, position, name, price_kobo, data, active, created_at")
      .eq("site_id", siteId)
      .eq("active", true)
      .order("position", { ascending: true })
      .limit(500);
    if (error || !data) return [];
    return (data as BusinessItemRow[]).filter(
      (r) => isBusinessKind(r.kind) && r.data && typeof r.data === "object" && !Array.isArray(r.data),
    );
  } catch {
    return [];
  }
});
