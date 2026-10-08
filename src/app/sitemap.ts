import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { normalizeHost } from "@/lib/hostRouting";
import { TEMPLATE_META } from "@/templates/meta";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").toLowerCase();

// Platform domain only. Client sites get their own sitemap in the launch-readiness work.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  if (normalizeHost(h.get("x-forwarded-host") || h.get("host") || "") !== PLATFORM) return [];
  const base = `https://${PLATFORM}`;
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/pricing`, priority: 0.9 },
    { url: `${base}/templates`, priority: 0.9 },
    { url: `${base}/start`, priority: 0.6 },
    { url: `${base}/signup`, priority: 0.6 },
    ...TEMPLATE_META.map((t) => ({ url: `${base}/templates/${t.key}`, priority: 0.7 })),
  ];
}
