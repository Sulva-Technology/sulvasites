"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageData, PageKey } from "@/lib/pageSchema";
import { useCart } from "@/lib/shop/useCart";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import { siteStartMode } from "@/lib/templateTheme";
import type { TemplateProps } from "@/templates/registry";
import { useColorMode } from "@/templates/shared/colorMode";
import TemplateFonts from "@/templates/shared/fonts";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T7Footer from "./components/T7Footer";
import T7Header from "./components/T7Header";
import { collectHours, T7Provider } from "./ctx";
import T7Sections from "./sections/T7Sections";
import CartDrawer from "./shop/CartDrawer";
import ShopViews from "./shop/ShopViews";
import StickyCartBar from "./shop/StickyCartBar";
import "./template7.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

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

/** Template 7 — "Tavola": restaurants, cafés, caterers and bakeries, with online food ordering. */
export default function Template7({
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
    "t7",
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
  const homeHasMenu = !!pages.home?.sections?.some(
    (s) => s?.type === "services" && s.items?.some((it) => it.title?.trim()),
  );
  const [mode, toggleMode] = useColorMode(siteStartMode(site.template_key, profile.theme_colors, "dark"));
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
  const shopViewKind = shopView?.kind ?? null;
  const ctx = useMemo(
    () => ({
      baseUrl,
      navPages,
      photos,
      hours,
      homeHasMenu,
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
      shopViewKind,
    }),
    [
      baseUrl,
      navPages,
      photos,
      hours,
      homeHasMenu,
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
    root.querySelectorAll(".t7-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData, shopView]);

  return (
    <T7Provider value={ctx}>
      <div ref={rootRef} className="template7" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T7Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          {shop && shopView ? <ShopViews view={shopView} /> : <T7Sections pageData={pageData} />}
        </main>
        <T7Footer logoUrl={logoUrl} />
        <p className="t7-sr" role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        {shop && !cartOpen ? <StickyCartBar /> : null}
        {shop && cartOpen ? <CartDrawer /> : null}
      </div>
    </T7Provider>
  );
}
