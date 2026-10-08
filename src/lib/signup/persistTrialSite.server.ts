import type { SupabaseClient } from "@supabase/supabase-js";

import { validatePageData } from "@/lib/pageSchema";
import { safeSlug } from "@/lib/reservedSlugs";
import { ensureShopEnabled, shopOnByDefault } from "@/lib/shop/autoEnable";
import type { TrialBuild } from "@/lib/signup/fallbackSite";

/** Inserts the site row (service role), trying "-2", "-3"… on slug clashes. The handle_new_site trigger adds profile + pages. */
export async function insertTrialSite(db: SupabaseClient, businessName: string, templateKey: string): Promise<{ siteId: string; slug: string } | null> {
  const base = safeSlug(businessName);
  for (let attempt = 1; attempt <= 8; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await db.from("sites").insert({ slug, template_key: templateKey }).select("id").single();
    if (!error && data) return { siteId: data.id as string, slug };
    if (error && error.code !== "23505") {
      console.error("[signup] site insert failed", error.message);
      return null;
    }
  }
  return null;
}

/** Writes profile + pages and publishes everything. Returns warnings; never throws for content problems. */
export async function persistTrialSite(db: SupabaseClient, siteId: string, build: TrialBuild): Promise<string[]> {
  const warnings: string[] = [];
  const now = new Date().toISOString();

  const p = build.profile;
  const payload: Record<string, unknown> = { business_name: p.business_name };
  for (const k of ["tagline", "description", "address", "phone", "email", "whatsapp"] as const) {
    if (p[k]) payload[k] = p[k];
  }
  const socials = Object.fromEntries(Object.entries(p.socials ?? {}).filter(([, v]) => !!v));
  if (Object.keys(socials).length) payload.socials = { instagram: null, facebook: null, twitter: null, tiktok: null, ...socials };
  const { error: profileErr } = await db.from("business_profiles").update(payload).eq("site_id", siteId);
  if (profileErr) warnings.push(`profile: ${profileErr.message}`);

  for (const key of ["home", "about", "contact"] as const) {
    const data = build.pages[key];
    if (!validatePageData(data).ok) {
      warnings.push(`${key}: invalid page data`);
      continue;
    }
    const { error } = await db.from("pages").update({ data, status: "published", published_at: now }).eq("site_id", siteId).eq("key", key);
    if (error) warnings.push(`${key}: ${error.message}`);
  }

  for (const extra of build.extraPages) {
    if (!validatePageData(extra.data).ok) continue;
    const { error } = await db
      .from("extra_pages")
      .insert({ site_id: siteId, key: extra.key, data: extra.data, status: "published", published_at: now });
    if (error) warnings.push(`${extra.key}: ${error.message}`);
  }

  const { error: siteErr } = await db.from("sites").update({ status: "published" }).eq("id", siteId);
  if (siteErr) warnings.push(`publish: ${siteErr.message}`);

  if (shopOnByDefault(build.templateKey) && !(await ensureShopEnabled(db, siteId, "new_site"))) {
    warnings.push("shop: could not be switched on");
  }
  return warnings;
}
