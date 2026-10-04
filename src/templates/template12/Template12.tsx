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
import T12Footer from "./components/T12Footer";
import T12Header from "./components/T12Header";
import { collectCredentials, collectHours, collectServices, T12Provider } from "./ctx";
import T12Sections from "./sections/T12Sections";
import "./template12.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600;700&family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..700&display=swap";

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

/** Template 12 — "Forge": builders, renovators, electricians, plumbers and home services. */
export default function Template12({
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
    "t12",
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
  const services = useMemo(
    () => collectServices([pageData, pages.home, pages.about, pages.contact], 24),
    [pageData, pages],
  );
  const credentials = useMemo(
    () => collectCredentials([pageData, pages.home, pages.about, pages.contact], 6),
    [pageData, pages],
  );
  const pageHasForm = !!pageData?.sections?.some((s) => s?.type === "contact_card" && s.showForm);
  const pageHasServices = !!pageData?.sections?.some(
    (s) => s?.type === "services" && (editor?.enabled || s.items?.some((it) => it.title?.trim())),
  );
  const pageHasCredentials = !!pageData?.sections?.some(
    (s) => s?.type === "backed_by" && (editor?.enabled || s.logos?.some((l) => l.name?.trim() || l.url)),
  );
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
      services,
      credentials,
      pageHasServices,
      pageHasForm,
      pageHasCredentials,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
    }),
    [
      baseUrl,
      navPages,
      photos,
      hours,
      services,
      credentials,
      pageHasServices,
      pageHasForm,
      pageHasCredentials,
      profile,
      pageKind,
      pageLabel,
      mode,
      toggleMode,
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
    root.querySelectorAll(".t12-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T12Provider value={ctx}>
      <div ref={rootRef} className="template12" data-mode={mode} data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T12Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T12Sections pageData={pageData} />
        </main>
        <T12Footer logoUrl={logoUrl} />
      </div>
    </T12Provider>
  );
}
