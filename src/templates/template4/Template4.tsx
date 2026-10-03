"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import TemplateFonts from "@/templates/shared/fonts";
import T4Footer from "./components/T4Footer";
import T4Header from "./components/T4Header";
import { collectProductMedia, T4Provider } from "./ctx";
import T4Sections from "./sections/T4Sections";
import "./template4.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";

/** Template 4 — "Launch": product / app / startup. */
export default function Template4({
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
    "t4",
  );
  const motion = !editor?.enabled;

  const media = useMemo(
    () => collectProductMedia([pageData, pages.home, pages.about, pages.contact]),
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
    root.querySelectorAll(".t4-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T4Provider value={ctx}>
      <div ref={rootRef} className="template4" style={themeStyle}>
        <TemplateFonts href={FONTS} />
        <T4Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T4Sections pageData={pageData} />
        </main>
        <T4Footer logoUrl={logoUrl} />
      </div>
    </T4Provider>
  );
}
