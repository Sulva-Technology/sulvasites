import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { getPublicAssetUrl } from "@/lib/assets";
import { BLOG_NAV_KEY, blogLabelFor } from "@/lib/blog/blogPath";
import { hasPublishedPosts } from "@/lib/blog/load.server";
import { normalizeHostname } from "@/lib/domains";
import { primaryHostFor } from "@/lib/search/siteHosts.server";
import type { PageData, PageKey } from "@/lib/pageSchema";
import { validatePageData } from "@/lib/pageSchema";
import {
  resolveSiteByHostname,
  resolveSiteBySlug,
  type SiteData,
} from "@/lib/siteResolver.server";
import { supabaseServer } from "@/lib/supabase/server";
import { labelForPageKey, sortPageKeys } from "@/templates/pagePresets";
import type { NavPage } from "@/templates/registry";

/**
 * Shared logic for every public site route:
 *   /[slug]/...          (platform subdomains + path-based preview)
 *   /d/[hostname]/...    (custom domains, rewritten by middleware)
 */

export type SiteLookup = "slug" | "hostname";

export type PublicSiteContext = {
  siteData: SiteData;
  /** Prefix for internal links: "" on a subdomain/custom domain, "/<slug>" on path-based access. */
  baseUrl: string;
  /** Host used for canonical URLs, OG images, and JSON-LD. */
  canonicalHost: string | undefined;
  proto: string;
  /** Query string that identifies this site to /api/og and /api/icon. */
  siteQuery: string;
  logoUrl: string | undefined;
};

export type PublicPage =
  | { kind: "core"; key: PageKey; data: PageData }
  | { kind: "extra"; key: string; data: PageData };

function platformDomain() {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site")
    .trim()
    .toLowerCase();
}

// cache() dedupes the DB round-trips between generateMetadata and the page render.
const resolveBySlug = cache(resolveSiteBySlug);
const resolveByHostname = cache(resolveSiteByHostname);

export const loadPublicSite = cache(
  async (lookup: SiteLookup, value: string): Promise<PublicSiteContext | null> => {
    const h = await headers();
    const reqHost = normalizeHostname(h.get("x-forwarded-host") || h.get("host") || "");
    const proto =
      (h.get("x-forwarded-proto") || "https").split(",")[0]!.trim() || "https";

    const siteData =
      lookup === "slug" ? await resolveBySlug(value) : await resolveByHostname(value);
    if (!siteData) return null;

    const logoUrl = siteData.profile.logo_path
      ? getPublicAssetUrl(siteData.profile.logo_path)
      : undefined;

    // One canonical address per site (oldest active custom domain, else the subdomain), so a site
    // reachable on both is not indexed twice. Local and preview hosts keep their own address.
    const devHost = reqHost.includes("localhost") || reqHost.endsWith(".vercel.app");
    const primary = await primaryHostFor(siteData.site);

    if (lookup === "hostname") {
      return {
        siteData,
        baseUrl: "",
        canonicalHost: devHost ? reqHost : primary,
        proto,
        siteQuery: `hostname=${encodeURIComponent(value)}`,
        logoUrl,
      };
    }

    const platform = platformDomain();
    const isSubdomain = reqHost === `${value}.${platform}`;
    const canonicalHost = devHost && reqHost ? reqHost : primary;

    return {
      siteData,
      baseUrl: isSubdomain ? "" : `/${value}`,
      canonicalHost,
      proto,
      siteQuery: `slug=${encodeURIComponent(value)}`,
      logoUrl,
    };
  },
);

/**
 * Published extra pages for the site's navigation, in template-preset order, then "Blog" once a
 * post is published (it replaces any extra page keyed "blog").
 */
export const loadNavPages = cache(
  async (siteId: string, templateKey: string): Promise<NavPage[]> => {
    const [{ data, error }, blog] = await Promise.all([
      supabaseServer().from("extra_pages").select("key").eq("site_id", siteId).eq("status", "published"),
      hasPublishedPosts(siteId),
    ]);
    const keys = error || !data ? [] : (data as Array<{ key: string }>).map((r) => r.key);
    const pages: NavPage[] = sortPageKeys(templateKey, keys)
      .filter((key) => !(blog && key === BLOG_NAV_KEY))
      .map((key) => ({ key, label: labelForPageKey(templateKey, key) }));
    if (blog) pages.push({ key: BLOG_NAV_KEY, label: blogLabelFor(templateKey), href: "/blog" });
    return pages;
  },
);

export const loadPublishedExtraPage = cache(
  async (siteId: string, key: string): Promise<PageData | null> => {
    const { data, error } = await supabaseServer()
      .from("extra_pages")
      .select("data")
      .eq("site_id", siteId)
      .eq("key", key)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    const pageData = (data as { data: unknown }).data;
    return validatePageData(pageData).ok ? (pageData as PageData) : null;
  },
);

function pagePath(page: PublicPage) {
  if (page.kind === "extra") return `/p/${page.key}`;
  return page.key === "home" ? "" : `/${page.key}`;
}

function pageSeo(ctx: PublicSiteContext, page: PublicPage) {
  const name = ctx.siteData.profile.business_name;
  const { title, description } = page.data.seo;

  if (page.kind === "extra") {
    return {
      title: title || `${name} | ${page.key}`,
      description: description || `Learn more about ${name}.`,
    };
  }

  const fallbackTitle = {
    home: `${name} | Professional Services`,
    about: `${name} | About Us`,
    contact: `${name} | Contact Us`,
  }[page.key];
  const fallbackDescription = {
    home: `Learn about ${name} and our professional services.`,
    about: `Learn about ${name} and our story.`,
    contact: `Learn about ${name} and get in touch.`,
  }[page.key];

  return {
    title: title || fallbackTitle,
    description: description || fallbackDescription,
  };
}

export function buildSiteMetadata(ctx: PublicSiteContext, page: PublicPage): Metadata {
  const name = ctx.siteData.profile.business_name;
  const { title, description } = pageSeo(ctx, page);

  const origin = ctx.canonicalHost ? `${ctx.proto}://${ctx.canonicalHost}` : undefined;
  const canonical = ctx.canonicalHost
    ? `https://${ctx.canonicalHost}${pagePath(page)}`
    : undefined;
  const ogPage = page.kind === "core" ? page.key : "home";
  const ogImageUrl = origin
    ? `${origin}/api/og/site?${ctx.siteQuery}&page=${encodeURIComponent(ogPage)}`
    : undefined;
  const iconUrl = origin ? `${origin}/api/icon/site?${ctx.siteQuery}` : undefined;
  const logoUrl = ctx.logoUrl;

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title,
    description,
    keywords: `${name}, ${page.key}, services, business`,
    authors: [{ name }],
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: name,
      images: [
        ...(ogImageUrl
          ? [
              {
                url: ogImageUrl,
                secureUrl: ogImageUrl,
                type: "image/png",
                width: 1200,
                height: 630,
                alt: name,
              },
            ]
          : []),
        ...(logoUrl ? [{ url: logoUrl, secureUrl: logoUrl, alt: name }] : []),
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : logoUrl ? [logoUrl] : [],
    },
    icons: iconUrl
      ? { icon: iconUrl, apple: iconUrl }
      : logoUrl
        ? { icon: logoUrl }
        : undefined,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: canonical ? { canonical } : undefined,
  };
}

export function buildStructuredData(ctx: PublicSiteContext, page: PublicPage) {
  const { profile } = ctx.siteData;
  const url = ctx.canonicalHost
    ? `https://${ctx.canonicalHost}${pagePath(page)}`
    : undefined;
  const contactPoint = profile.phone
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          telephone: profile.phone,
          contactType: "customer service",
          ...(profile.email && { email: profile.email }),
        },
      }
    : {};

  if (page.kind === "core" && page.key === "home") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: profile.business_name,
      ...(url && { url }),
      ...(ctx.logoUrl && { logo: ctx.logoUrl }),
      ...(profile.description && { description: profile.description }),
      ...(profile.address && {
        address: { "@type": "PostalAddress", streetAddress: profile.address },
      }),
      ...contactPoint,
    };
  }

  if (page.kind === "core" && page.key === "contact") {
    return {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      ...(url && { url }),
      mainEntity: {
        "@type": "Organization",
        name: profile.business_name,
        ...contactPoint,
      },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.data.seo.title || `${profile.business_name} - ${page.key}`,
    description: page.data.seo.description,
    ...(url && { url }),
    ...(ctx.logoUrl && { image: ctx.logoUrl }),
  };
}
