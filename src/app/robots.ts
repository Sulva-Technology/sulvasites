import type { MetadataRoute } from "next";

const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com").toLowerCase();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/dev"] }],
    sitemap: `https://${PLATFORM}/sitemap.xml`,
  };
}
