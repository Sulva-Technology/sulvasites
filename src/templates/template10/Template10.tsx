"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageData, PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { useColorMode } from "@/templates/shared/colorMode";
import TemplateFonts from "@/templates/shared/fonts";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T10Footer from "./components/T10Footer";
import T10Header from "./components/T10Header";
import { collectHours, collectTitles, T10Provider } from "./ctx";
import T10Sections from "./sections/T10Sections";
import "./template10.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap";

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

/** Template 10 — "Campus": schools, tutors, academies and training centres. */
export default function Template10({
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
    "t10",
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
  const programmes = useMemo(
    () => collectTitles([pageData, pages.home, pages.about, pages.contact], "services", 24),
    [pageData, pages],
  );
  const highlights = useMemo(
    () => collectTitles([pageData, pages.home, pages.about, pages.contact], "values", 4),
    [pageData, pages],
  );
  const pageHasForm = !!pageData?.sections?.some((s) => s?.type === "contact_card" && s.showForm);
  const [mode, toggleMode] = useColorMode();
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
      hours,
      programmes,
      highlights,
      pageHasForm,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
    }),
    [baseUrl, navPages, photos, hours, programmes, highlights, pageHasForm, profile, pageKind, pageLabel, mode, toggleMode],
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
    root.querySelectorAll(".t10-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T10Provider value={ctx}>
      <div
        ref={rootRef}
        className="template10"
        data-mode={mode}
        data-page={pageKind}
        data-cta={pageKind !== "contact" && !pageHasForm}
        style={themeStyle}
      >
        <TemplateFonts href={FONTS} />
        <T10Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T10Sections pageData={pageData} />
        </main>
        <T10Footer logoUrl={logoUrl} />
      </div>
    </T10Provider>
  );
}
