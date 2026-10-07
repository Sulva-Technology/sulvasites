"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { siteStartMode } from "@/lib/templateTheme";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { useColorMode } from "@/templates/shared/colorMode";
import TemplateFonts from "@/templates/shared/fonts";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T17Feed from "./components/T17Feed";
import T17Footer from "./components/T17Footer";
import T17Header from "./components/T17Header";
import { collectPhotos, T17Provider } from "./ctx";
import T17Sections from "./sections/T17Sections";
import "./template17.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap";

/**
 * Template 17 — "Folio": writers, bloggers, newsletters and small publications.
 * Warm paper (or ink-dark) pages, Newsreader serif headlines, a masthead header, and a home page
 * that leads with the latest posts. Every page ends with a subscribe band. Light-first, dark too.
 */
export default function Template17({
  site,
  profile,
  pages,
  currentPage = "home",
  baseUrl = "",
  pageOverride,
  navPages = [],
  currentExtraKey = null,
  slot,
  blog,
}: TemplateProps) {
  const editor = useInlineEditor();
  const rootRef = useRef<HTMLDivElement>(null);

  const logoUrl = profile.logo_path ? getPublicAssetUrl(profile.logo_path) : null;
  const effectivePage: PageKey = pageOverride ? "home" : (currentPage ?? "home");
  const navPage: PageKey | null = pageOverride ? null : (currentPage ?? "home");
  const pageData = pageOverride ?? pages[effectivePage];
  const themeStyle = sanitizeThemeStyle(
    buildTemplateThemeStyle(site.template_key, profile) as CSSProperties | undefined,
    "t17",
  );
  const motion = !editor?.enabled;
  const [mode, toggleMode] = useColorMode(siteStartMode(site.template_key, profile.theme_colors, "light"));

  const photos = useMemo(() => collectPhotos([pageData, pages.home, pages.about, pages.contact]), [pageData, pages]);
  const pageHasForm = !!pageData?.sections?.some((s) => s?.type === "contact_card" && s.showForm);
  const pageKind: "home" | "about" | "contact" | "extra" = currentExtraKey
    ? "extra"
    : effectivePage === "about" || effectivePage === "contact"
      ? effectivePage
      : "home";
  const pageLabel = navPages.find((p) => p.key === currentExtraKey)?.label || pageData?.seo?.title || "";
  const ctx = useMemo(
    () => ({ baseUrl, navPages, profile, pageKind, pageLabel, photos, blog, pageHasForm, mode, toggleMode }),
    [baseUrl, navPages, profile, pageKind, pageLabel, photos, blog, pageHasForm, mode, toggleMode],
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
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    root.querySelectorAll(".t17-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData, slot]);

  // The home page leads with the latest posts right after its opening hero.
  const feed = pageKind === "home" ? <T17Feed /> : null;

  return (
    <T17Provider value={ctx}>
      <div ref={rootRef} className="template17" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T17Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T17Sections pageData={pageData} afterHero={feed} />
          {slot}
        </main>
        <T17Footer logoUrl={logoUrl} />
      </div>
    </T17Provider>
  );
}
