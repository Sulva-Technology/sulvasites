import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { normalizeHost } from "@/lib/hostRouting";
import { platformEntries } from "@/lib/search/platformEntries";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").toLowerCase();

// Platform domain only. Site hosts rewrite /sitemap.xml to their own route (src/app/[slug]/sitemap.xml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  if (normalizeHost(h.get("x-forwarded-host") || h.get("host") || "") !== PLATFORM) return [];
  return platformEntries(`https://${PLATFORM}`);
}
