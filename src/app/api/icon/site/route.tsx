import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { resolveSiteByHostname, resolveSiteBySlug } from "@/lib/siteResolver.server";

export const runtime = "edge";

function toPublicAssetUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const normalized = base.replace(/\/$/, "");
  return `${normalized}/storage/v1/object/public/site-assets/${path}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "S";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

function gradient(templateKey: string) {
  switch (templateKey) {
    case "t10":
      return "linear-gradient(135deg, #2747d6, #121a3a)";
    case "t9":
      return "linear-gradient(135deg, #e5322d, #ff6a3d)";
    case "t8":
      return "linear-gradient(135deg, #0f8a7e, #4fd1b5)";
    case "t7":
      return "linear-gradient(135deg, #b5452b, #e0784f)";
    case "t6":
      return "linear-gradient(135deg, #22c55e, #60a5fa)";
    case "t5":
      return "linear-gradient(135deg, #2563eb, #db2777)";
    case "t4":
      return "linear-gradient(135deg, #7c3aed, #06b6d4)";
    case "t3":
      return "linear-gradient(135deg, #0f766e, #b45309)";
    default:
      return "linear-gradient(135deg, #6366F1, #8B5CF6)";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();
  const hostname = (searchParams.get("hostname") || "").trim();

  const siteData = slug
    ? await resolveSiteBySlug(slug)
    : hostname
      ? await resolveSiteByHostname(hostname)
      : null;

  const businessName = siteData?.profile.business_name || "Site";
  const templateKey = siteData?.site.template_key || "t1";

  const rawLogoPath = siteData?.profile.logo_path || "";
  const logoUrl = rawLogoPath ? toPublicAssetUrl(rawLogoPath) : null;
  const isSvgLogo = (rawLogoPath || "").toLowerCase().endsWith(".svg") || (logoUrl || "").toLowerCase().includes(".svg");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 160,
          background: gradient(templateKey),
        }}
      >
        {logoUrl && !isSvgLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            width={152}
            height={152}
            style={{
              borderRadius: 44,
              objectFit: "cover",
              background: "rgba(0,0,0,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
            }}
            alt={businessName}
          />
        ) : (
          <div
            style={{
              width: 176,
              height: 176,
              borderRadius: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
              color: "rgba(255,255,255,0.95)",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            {initials(businessName)}
          </div>
        )}
      </div>
    ),
    {
      width: 256,
      height: 256,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

