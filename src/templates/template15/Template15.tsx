"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import { siteStartMode } from "@/lib/templateTheme";
import type { TemplateProps } from "@/templates/registry";
import { useColorMode } from "@/templates/shared/colorMode";
import TemplateFonts from "@/templates/shared/fonts";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T15Footer from "./components/T15Footer";
import T15Header from "./components/T15Header";
import { collectMedia, collectVehicles, firstVehicle, T15Provider } from "./ctx";
import T15Sections from "./sections/T15Sections";
import "./template15.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..600&display=swap";

/**
 * Template 15 — "Marque": car dealers, classic and luxury showrooms, restorers, detailers and car clubs.
 * Dark-first obsidian glass with a cinematic full-bleed hero; light "pearl" mode too.
 */
export default function Template15({
  site,
  profile,
  pages,
  currentPage = "home",
  baseUrl = "",
  pageOverride,
  navPages = [],
  currentExtraKey = null,
  slot,
}: TemplateProps) {
  const editor = useInlineEditor();
  const rootRef = useRef<HTMLDivElement>(null);

  const logoUrl = profile.logo_path ? getPublicAssetUrl(profile.logo_path) : null;
  const effectivePage: PageKey = pageOverride ? "home" : (currentPage ?? "home");
  const navPage: PageKey | null = pageOverride ? null : (currentPage ?? "home");
  const pageData = pageOverride ?? pages[effectivePage];
  // Drop legacy text/background overrides that would be unreadable on this design.
  const themeStyle = sanitizeThemeStyle(
    buildTemplateThemeStyle(site.template_key, profile) as CSSProperties | undefined,
    "t15",
  );
  const motion = !editor?.enabled;

  const media = useMemo(
    () => collectMedia([pageData, pages.home, pages.about, pages.contact]),
    [pageData, pages],
  );
  const vehicles = useMemo(
    () => collectVehicles([pageData, pages.home, pages.about, pages.contact], 24),
    [pageData, pages],
  );
  const featured = useMemo(() => firstVehicle([pageData, pages.home]), [pageData, pages]);
  const pageHasForm = !!pageData?.sections?.some((s) => s?.type === "contact_card" && s.showForm);
  const pageHasCollection = !!pageData?.sections?.some(
    (s) => s?.type === "use_cases" && (editor?.enabled || s.items?.some((it) => it.title?.trim())),
  );
  const [mode, toggleMode] = useColorMode(siteStartMode(site.template_key, profile.theme_colors, "dark"));
  const pageKind: "home" | "about" | "contact" | "extra" = currentExtraKey
    ? "extra"
    : effectivePage === "about" || effectivePage === "contact"
      ? effectivePage
      : "home";
  const pageLabel = navPages.find((p) => p.key === currentExtraKey)?.label || pageData?.seo?.title || "";
  const ctx = useMemo(
    () => ({
      baseUrl,
      navPages,
      photos: media.photos,
      video: media.videos[0] ?? null,
      vehicles,
      featured,
      pageHasCollection,
      pageHasForm,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
    }),
    [baseUrl, navPages, media, vehicles, featured, pageHasCollection, pageHasForm, profile, pageKind, pageLabel, mode, toggleMode],
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
    root.querySelectorAll(".t15-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T15Provider value={ctx}>
      <div ref={rootRef} className="template15" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T15Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T15Sections pageData={pageData} />
          {slot}
        </main>
        <T15Footer logoUrl={logoUrl} />
      </div>
    </T15Provider>
  );
}
