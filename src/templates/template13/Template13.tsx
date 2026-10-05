"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageData, PageKey } from "@/lib/pageSchema";
import { useCart } from "@/lib/shop/useCart";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { useColorMode } from "@/templates/shared/colorMode";
import TemplateFonts from "@/templates/shared/fonts";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T13Composer, { composerEligible } from "./components/T13Composer";
import T13Footer from "./components/T13Footer";
import T13Header from "./components/T13Header";
import { collectHours, findSizeGuideHtml, T13Provider } from "./ctx";
import T13Sections from "./sections/T13Sections";
import CartDrawer from "./shop/CartDrawer";
import ShopViews from "./shop/ShopViews";
import "./template13.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";

function galleryPhotos(pages: Array<PageData | undefined>) {
  const seen = new Set<string>();
  const out: Array<{ url: string; alt: string }> = [];
  for (const page of pages) {
    for (const s of page?.sections ?? []) {
      if (s?.type !== "gallery") continue;
      for (const img of s.images ?? []) {
        const url = img.url?.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          out.push({ url, alt: img.alt || "" });
        }
      }
    }
  }
  return out;
}

/** Template 13 — "Mode": fashion boutiques and clothing brands with an online shop. */
export default function Template13({
  site,
  profile,
  pages,
  currentPage = "home",
  baseUrl = "",
  pageOverride,
  navPages = [],
  currentExtraKey = null,
  shop,
  shopView,
}: TemplateProps) {
  const editor = useInlineEditor();
  const rootRef = useRef<HTMLDivElement>(null);

  const logoUrl = profile.logo_path ? getPublicAssetUrl(profile.logo_path) : null;
  const effectivePage: PageKey = pageOverride ? "home" : (currentPage ?? "home");
  const navPage: PageKey | null = pageOverride || shopView ? null : (currentPage ?? "home");
  const pageData = pageOverride ?? pages[effectivePage];
  // Drop legacy text/background overrides that would be unreadable on this design.
  const themeStyle = sanitizeThemeStyle(
    buildTemplateThemeStyle(site.template_key, profile) as CSSProperties | undefined,
    "t13",
  );
  const motion = !editor?.enabled;

  const photos = useMemo(
    () => galleryPhotos([pageData, pages.home, pages.about, pages.contact]),
    [pageData, pages],
  );
  const hours = useMemo(
    () => collectHours(profile, [pages.contact, pages.home, pages.about, pageData]),
    [profile, pages, pageData],
  );
  const sizeGuideHtml = useMemo(
    () => findSizeGuideHtml([pageData, pages.about, pages.home, pages.contact]),
    [pageData, pages],
  );
  const [mode, toggleMode] = useColorMode("dark");

  const siteId = shop?.siteId ?? site.id;
  const cart = useCart(siteId);
  const [cartOpen, setCartOpen] = useState(false);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const [status, setStatus] = useState("");
  const announce = useCallback((message: string) => {
    // Clear first so repeating the same message is announced again.
    setStatus("");
    window.setTimeout(() => setStatus(message), 30);
  }, []);

  const pageKind: "home" | "about" | "contact" | "extra" | "shop" = shopView
    ? "shop"
    : currentExtraKey
      ? "extra"
      : effectivePage === "about" || effectivePage === "contact"
        ? effectivePage
        : "home";
  const pageLabel = navPages.find((p) => p.key === currentExtraKey)?.label || pageData?.seo?.title || "";
  const hasSizeGuidePage = navPages.some((p) => p.key === "size-guide");

  const ctx = useMemo(
    () => ({
      baseUrl,
      navPages,
      photos,
      hours,
      profile,
      pageKind,
      pageLabel,
      shopViewKind: shopView?.kind ?? null,
      mode,
      toggleMode,
      shop: shop ?? null,
      siteId,
      cart,
      cartOpen,
      openCart,
      closeCart,
      announce,
      sizeGuideHtml,
      hasSizeGuidePage,
    }),
    [
      baseUrl,
      navPages,
      photos,
      hours,
      profile,
      pageKind,
      pageLabel,
      shopView?.kind,
      mode,
      toggleMode,
      shop,
      siteId,
      cart,
      cartOpen,
      openCart,
      closeCart,
      announce,
      sizeGuideHtml,
      hasSizeGuidePage,
    ],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !motion || typeof IntersectionObserver === "undefined") return;
    root.dataset.motion = "on";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.visible = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    root.querySelectorAll(".t13-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData, shopView]);

  return (
    <T13Provider value={ctx}>
      <div ref={rootRef} className="template13" data-mode={mode} data-page={pageKind} data-composer={!editor?.enabled && composerEligible(shop ?? null, pageKind, shopView?.kind ?? null)} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <a className="t13-skip" href="#t13-main">
          Skip to content
        </a>
        <T13Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} overHero={pageData?.sections?.[0]?.type === "hero"} />
        <main id="t13-main" tabIndex={-1}>
          {shop && shopView ? <ShopViews view={shopView} /> : <T13Sections pageData={pageData} />}
        </main>
        <T13Footer logoUrl={logoUrl} />
        <T13Composer />
        <p className="t13-sr" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        {shop && cartOpen ? <CartDrawer /> : null}
      </div>
    </T13Provider>
  );
}
