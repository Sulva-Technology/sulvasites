import type { SeoProfile } from "@/lib/ai/seo";
import { getAuthenticatedClient } from "@/lib/supabase/browser";

export async function fetchSeoProfile(siteId: string): Promise<SeoProfile | undefined> {
  try {
    const supabase = await getAuthenticatedClient();
    const { data } = await supabase
      .from("business_profiles")
      .select("business_name, tagline, description")
      .eq("site_id", siteId)
      .maybeSingle();
    return (data as SeoProfile | null) ?? undefined;
  } catch {
    return undefined;
  }
}
