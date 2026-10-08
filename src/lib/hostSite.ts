import type { SupabaseClient } from "@supabase/supabase-js";

import { siteRefForHost } from "./hostRouting";

/** What the current browser address means for the back office. */
export type HostSite =
  | { kind: "platform" } // main platform domain, localhost or preview: full admin
  | { kind: "site"; siteId: string } // a site's own address: only that site
  | { kind: "missing" }; // a site address that matches no site the user can see

export function platformDomain(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com";
}

/** Resolves `window.location.host` (or the given host) to the site it serves. */
export async function resolveHostSite(supabase: SupabaseClient, host?: string): Promise<HostSite> {
  const raw = host ?? (typeof window === "undefined" ? "" : window.location.host);
  const ref = siteRefForHost(raw, platformDomain());
  if (!ref) return { kind: "platform" };

  if ("slug" in ref) {
    const { data, error } = await supabase.from("sites").select("id").eq("slug", ref.slug).maybeSingle();
    if (error) throw error;
    return data?.id ? { kind: "site", siteId: data.id as string } : { kind: "missing" };
  }

  const { data, error } = await supabase
    .from("domains")
    .select("site_id")
    .eq("hostname", ref.hostname)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data?.site_id ? { kind: "site", siteId: data.site_id as string } : { kind: "missing" };
}
