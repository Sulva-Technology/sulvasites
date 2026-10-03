"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import TemplateFonts from "@/templates/shared/fonts";
import T1Footer from "./components/T1Footer";
import T1Header from "./components/T1Header";
import { collectCorporateMedia, T1Provider } from "./ctx";
import T1Sections from "./sections/T1Sections";
import "./template1.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

/** Template 1 — "Meridian": corporate / consultancy / professional services. */
export default function Template1({
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
  const themeStyle = sanitizeThemeStyle(
    buildTemplateThemeStyle(site.template_key, profile) as CSSProperties | undefined,
    "t1",
  );
  const motion = !editor?.enabled;

  const media = useMemo(
    () => collectCorporateMedia([pageData, pages.home, pages.about, pages.contact]),
    [pageData, pages],
  );
  const pageKind: "home" | "about" | "contact" | "extra" = currentExtraKey
    ? "extra"
    : effectivePage === "about" || effectivePage === "contact"
      ? effectivePage
      : "home";
  const pageLabel = navPages.find((p) => p.key === currentExtraKey)?.label || pageData?.seo?.title || "";
  const ctx = useMemo(
    () => ({ baseUrl, navPages, profile, pageKind, pageLabel, ...media }),
    [baseUrl, navPages, profile, pageKind, pageLabel, media],
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
    root.querySelectorAll(".t1-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T1Provider value={ctx}>
      <div ref={rootRef} className="template1" style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T1Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T1Sections pageData={pageData} />
        </main>
        <T1Footer logoUrl={logoUrl} />
      </div>
    </T1Provider>
  );
}
