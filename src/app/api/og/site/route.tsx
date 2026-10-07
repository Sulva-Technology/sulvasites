import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { resolveSiteByHostname, resolveSiteBySlug } from "@/lib/siteResolver.server";
import { isPageKey, type PageKey } from "@/lib/pageSchema";

export const runtime = "edge";

function toPublicAssetUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const normalized = base.replace(/\/$/, "");
  // Public bucket: site-assets
  return `${normalized}/storage/v1/object/public/site-assets/${path}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "S";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

function templateGradient(templateKey: string) {
  switch (templateKey) {
    case "t16":
      return "linear-gradient(135deg, rgba(22,109,156,0.30), rgba(10,42,61,0.30))";
    case "t15":
      return "linear-gradient(135deg, rgba(200,16,46,0.30), rgba(5,5,5,0.32))";
    case "t14":
      return "linear-gradient(135deg, rgba(31,111,235,0.30), rgba(14,23,38,0.30))";
    case "t13":
      return "linear-gradient(135deg, rgba(180,83,42,0.30), rgba(18,18,18,0.30))";
    case "t12":
      return "linear-gradient(135deg, rgba(242,107,29,0.32), rgba(29,33,36,0.30))";
    case "t11":
      return "linear-gradient(135deg, rgba(123,47,247,0.32), rgba(255,179,138,0.28))";
    case "t10":
      return "linear-gradient(135deg, rgba(39,71,214,0.30), rgba(255,200,58,0.24))";
    case "t9":
      return "linear-gradient(135deg, rgba(229,50,45,0.32), rgba(11,11,12,0.30))";
    case "t8":
      return "linear-gradient(135deg, rgba(15,138,126,0.30), rgba(79,209,181,0.20))";
    case "t7":
      return "linear-gradient(135deg, rgba(181,69,43,0.30), rgba(224,120,79,0.20))";
    case "t6":
      return "linear-gradient(135deg, rgba(34,197,94,0.28), rgba(96,165,250,0.22))";
    case "t5":
      return "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(219,39,119,0.18))";
    case "t4":
      return "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.18))";
    case "t3":
      return "linear-gradient(135deg, rgba(15,118,110,0.22), rgba(180,83,9,0.18))";
    default:
      return "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.18))";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();
  const hostname = (searchParams.get("hostname") || "").trim();
  const rawPage = (searchParams.get("page") || "home").trim();
  const pageKey: PageKey = isPageKey(rawPage) ? (rawPage as PageKey) : "home";

  const siteData = slug
    ? await resolveSiteBySlug(slug)
    : hostname
      ? await resolveSiteByHostname(hostname)
      : null;

  if (!siteData) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 80,
            background: "linear-gradient(135deg, #0b1020, #111827)",
            color: "white",
          }}
        >
          <div style={{ fontSize: 54, fontWeight: 900 }}>Site not found</div>
          <div style={{ marginTop: 16, fontSize: 28, opacity: 0.8 }}>
            Publish the site to enable previews.
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  }

  const businessName = siteData.profile.business_name || "Business";
  const seoTitle = siteData.pages[pageKey]?.seo?.title || "";
  const seoDesc = siteData.pages[pageKey]?.seo?.description || siteData.profile.tagline || siteData.profile.description || "";
  const title = seoTitle || businessName;
  const subtitle = seoDesc || "Visit the site to learn more.";

  const rawLogoPath = siteData.profile.logo_path || "";
  const logoUrl = rawLogoPath ? toPublicAssetUrl(rawLogoPath) : null;
  const isSvgLogo = (rawLogoPath || "").toLowerCase().endsWith(".svg") || (logoUrl || "").toLowerCase().includes(".svg");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 72,
          background: "linear-gradient(180deg, rgba(7,10,18,1), rgba(7,10,18,1))",
          color: "rgba(255,255,255,0.94)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: templateGradient(siteData.site.template_key),
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 520px at 15% 10%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(800px 520px at 85% 30%, rgba(255,255,255,0.06), transparent 60%)",
          }}
        />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22 }}>
          {logoUrl && !isSvgLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              width={92}
              height={92}
              style={{
                borderRadius: 24,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.18)",
              }}
              alt={businessName}
            />
          ) : (
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.18)",
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {initials(businessName)}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.9 }}>
              {businessName}
            </div>
            <div style={{ marginTop: 10, fontSize: 56, fontWeight: 950, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
              {title}
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 26, fontSize: 26, opacity: 0.9, maxWidth: 980, lineHeight: 1.35 }}>
          {subtitle}
        </div>

        <div style={{ position: "relative", marginTop: "auto", display: "flex", gap: 10, alignItems: "center", fontSize: 18, opacity: 0.92 }}>
          <div style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.18)" }}>
            {pageKey.toUpperCase()}
          </div>
          <div style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.18)" }}>
            {siteData.site.template_key.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

