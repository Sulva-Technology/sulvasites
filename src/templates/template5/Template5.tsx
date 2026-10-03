"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import TemplateFonts from "@/templates/shared/fonts";
import T5Footer from "./components/T5Footer";
import T5Header from "./components/T5Header";
import { collectSiteMedia, T5Provider } from "./ctx";
import T5Sections from "./sections/T5Sections";
import "./template5.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Jost:wght@300;400;500;600&display=swap";

/** Template 5 — "Maison": beauty / glam / booking. */
export default function Template5({
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
    "t5",
  );
  const motion = !editor?.enabled;

  const media = useMemo(
    () => collectSiteMedia([pageData, pages.home, pages.about, pages.contact]),
    [pageData, pages],
  );
  const ctx = useMemo(() => ({ baseUrl, navPages, profile, ...media }), [baseUrl, navPages, profile, media]);

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
    root.querySelectorAll(".t5-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T5Provider value={ctx}>
      <div ref={rootRef} className="template5" style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T5Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T5Sections pageData={pageData} />
        </main>
        <T5Footer />
      </div>
    </T5Provider>
  );
}
