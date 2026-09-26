"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import T2Footer from "./components/T2Footer";
import T2Header from "./components/T2Header";
import { collectPhotos, T2Provider } from "./ctx";
import T2Sections from "./sections/T2Sections";
import "./template2.css";

/** Template 2 — "Journal": editorial / magazine. */
export default function Template2({
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
    "t2",
  );
  const motion = !editor?.enabled;

  const photos = useMemo(() => collectPhotos([pageData, pages.home, pages.about, pages.contact]), [pageData, pages]);
  const ctx = useMemo(() => ({ baseUrl, navPages, profile, photos }), [baseUrl, navPages, profile, photos]);

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
    root.querySelectorAll(".t2-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <T2Provider value={ctx}>
      <div ref={rootRef} className="template2" style={themeStyle}>
        <T2Header logoUrl={logoUrl} currentPage={navPage} currentExtraKey={currentExtraKey} />
        <main>
          <T2Sections pageData={pageData} />
        </main>
        <T2Footer />
      </div>
    </T2Provider>
  );
}
