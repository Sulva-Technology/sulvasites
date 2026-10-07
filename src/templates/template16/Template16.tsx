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
import T16Footer from "./components/T16Footer";
import T16Header from "./components/T16Header";
import { collectCircles, collectHeroStats, collectPhotos, T16Provider } from "./ctx";
import T16Sections from "./sections/T16Sections";
import "./template16.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600&family=Playfair+Display:ital,wght@1,400;1,500&display=swap";

/**
 * Template 16 — "Circle": churches, faith communities, membership clubs, masterminds and nonprofits.
 * Quiet off-white (or near-black) canvas, Outfit headlines with a serif-italic accent phrase,
 * a deep-blue brand band and a glass pill header. Light-first, dark mode too.
 */
export default function Template16({
  site,
  profile,
  pages,
  currentPage = "home",
  baseUrl = "",
  pageOverride,
  navPages = [],
  currentExtraKey = null,
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
    "t16",
  );
  const motion = !editor?.enabled;

  const photos = useMemo(() => collectPhotos([pageData, pages.home, pages.about, pages.contact]), [pageData, pages]);
  const circles = useMemo(
    () => collectCircles([pageData, pages.home, pages.about, pages.contact], 24),
    [pageData, pages],
  );
  const heroStats = useMemo(() => collectHeroStats(pageData, 3), [pageData]);
  const pageHasForm = !!pageData?.sections?.some((s) => s?.type === "contact_card" && s.showForm);
  const pageHasCircles = !!pageData?.sections?.some(
    (s) => s?.type === "use_cases" && (editor?.enabled || s.items?.some((it) => it.title?.trim())),
  );
  const [mode, toggleMode] = useColorMode(siteStartMode(site.template_key, profile.theme_colors, "light"));
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
      photos,
      circles,
      heroStats,
      pageHasCircles,
      pageHasForm,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
    }),
    [baseUrl, navPages, photos, circles, heroStats, pageHasCircles, pageHasForm, profile, pageKind, pageLabel, mode, toggleMode],
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
    root.querySelectorAll(".t16-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T16Provider value={ctx}>
      <div ref={rootRef} className="template16" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T16Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T16Sections pageData={pageData} />
        </main>
        <T16Footer logoUrl={logoUrl} />
      </div>
    </T16Provider>
  );
}
