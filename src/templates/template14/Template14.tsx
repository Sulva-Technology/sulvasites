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
import T14Footer from "./components/T14Footer";
import T14Header from "./components/T14Header";
import { collectHours, T14Provider } from "./ctx";
import T14Sections from "./sections/T14Sections";
import CartDrawer from "./shop/CartDrawer";
import StickyCartBar from "./shop/StickyCartBar";
import ShopViews from "./shop/ShopViews";
import "./template14.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";

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

/** Template 14 — "Cartly": general stores and retailers with an online shop. */
export default function Template14({
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
    "t14",
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
  const [mode, toggleMode] = useColorMode();

  const siteId = shop?.siteId ?? site.id;
  const cart = useCart(siteId);
  const [query, setQuery] = useState("");
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
  const shopViewKind = shopView?.kind ?? null;

  const ctx = useMemo(
    () => ({
      baseUrl,
      navPages,
      photos,
      hours,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
      shop: shop ?? null,
      siteId,
      cart,
      cartOpen,
      openCart,
      closeCart,
      announce,
      query,
      setQuery,
      shopViewKind,
    }),
    [
      baseUrl,
      navPages,
      photos,
      hours,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
      shop,
      siteId,
      cart,
      cartOpen,
      openCart,
      closeCart,
      announce,
      query,
      shopViewKind,
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
    root.querySelectorAll(".t14-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData, shopView]);

  return (
    <T14Provider value={ctx}>
      <div ref={rootRef} className="template14" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <a className="t14-skip" href="#t14-main">
          Skip to content
        </a>
        <T14Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main id="t14-main" tabIndex={-1}>
          {shop && shopView ? <ShopViews view={shopView} /> : <T14Sections pageData={pageData} />}
        </main>
        <T14Footer logoUrl={logoUrl} />
        <p className="t14-sr" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        {shop && !cartOpen ? <StickyCartBar /> : null}
        {shop && cartOpen ? <CartDrawer /> : null}
      </div>
    </T14Provider>
  );
}
