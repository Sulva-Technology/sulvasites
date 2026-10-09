import { cache } from "react";

import { normalizeHostname } from "@/lib/domains";
import { primaryHost } from "@/lib/hostRouting";
import { supabaseServer } from "@/lib/supabase/server";

/** A site as seen by the crawl files (any status), with the one host it is canonical on. */
export type HostSite = {
  id: string;
  slug: string;
  template_key: string;
  status: string;
  primaryHost: string;
};

const SITE_COLS = "id, slug, template_key, status";
type SiteRow = Omit<HostSite, "primaryHost">;

export function platformDomain(): string {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site").trim().toLowerCase();
}

/** Active custom domains of a site (oldest first is decided by primaryHost). */
export const activeDomainsFor = cache(async (siteId: string): Promise<Array<{ hostname: string; created_at: string }>> => {
  const { data, error } = await supabaseServer()
    .from("domains")
    .select("hostname, created_at")
    .eq("site_id", siteId)
    .eq("status", "active");
  if (error || !data) return [];
  return data as Array<{ hostname: string; created_at: string }>;
});

export async function primaryHostFor(site: { id: string; slug: string }): Promise<string> {
  return primaryHost(site.slug, await activeDomainsFor(site.id), platformDomain());
}

async function withHost(site: SiteRow | null): Promise<HostSite | null> {
  if (!site) return null;
  return { ...site, primaryHost: await primaryHostFor(site) };
}

export const siteForSlug = cache(async (slug: string): Promise<HostSite | null> => {
  const { data, error } = await supabaseServer().from("sites").select(SITE_COLS).eq("slug", slug).maybeSingle();
  if (error) return null;
  return withHost(data as SiteRow | null);
});

export const siteForHostname = cache(async (hostname: string): Promise<HostSite | null> => {
  const host = normalizeHostname(hostname);
  if (!host) return null;
  const db = supabaseServer();
  const { data: domain, error } = await db
    .from("domains")
    .select("site_id")
    .eq("hostname", host)
    .eq("status", "active")
    .maybeSingle();
  if (error || !domain) return null;
  const { data, error: siteError } = await db
    .from("sites")
    .select(SITE_COLS)
    .eq("id", (domain as { site_id: string }).site_id)
    .maybeSingle();
  if (siteError) return null;
  return withHost(data as SiteRow | null);
});
