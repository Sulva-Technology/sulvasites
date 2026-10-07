"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { getPublicAssetUrl } from "@/lib/assets";
import type { PageKey } from "@/lib/pageSchema";
import { buildTemplateThemeStyle } from "@/lib/themeVars";
import type { TemplateProps } from "@/templates/registry";
import { sanitizeThemeStyle } from "@/templates/shared/theme";
import TemplateFonts from "@/templates/shared/fonts";
import T3Footer from "./components/T3Footer";
import T3Header from "./components/T3Header";
import T3Sections from "./sections/T3Sections";
import "./template3.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap";

/** Template 3 — "Atelier": portfolio / personal brand. */
export default function Template3({
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
  const socials = (profile.socials || {}) as Record<string, string>;
  const effectivePage: PageKey = pageOverride ? "home" : (currentPage ?? "home");
  const navPage: PageKey | null = pageOverride ? null : (currentPage ?? "home");
  const pageData = pageOverride ?? pages[effectivePage];
  // Drop legacy text/background overrides that would be unreadable on this design.
  const themeStyle = sanitizeThemeStyle(
    buildTemplateThemeStyle(site.template_key, profile) as CSSProperties | undefined,
    "t3",
  );
  const motion = !editor?.enabled;

  const pageKind = currentExtraKey ? "extra" : effectivePage === "about" || effectivePage === "contact" ? effectivePage : "home";
  const extraIndex = navPages.findIndex((p) => p.key === currentExtraKey);
  const pageLabel = navPages[extraIndex]?.label || pageData?.seo?.title || "";
  // Home, About, extras..., Contact — matches the header's numbering.
  const pageNumber = extraIndex >= 0 ? extraIndex + 3 : 1;
  // Media + titles gathered from the whole site, used by the page heroes.
  const heroData = useMemo(() => {
    const photos: Array<{ url: string; alt: string }> = [];
    const highlights: string[] = [];
    const projects: string[] = [];
    const push = (list: string[], v?: string) => {
      const t = v?.trim();
      if (t && !list.includes(t)) list.push(t);
    };
    for (const page of [pageData, pages.home, pages.about, pages.contact]) {
      for (const s of page?.sections ?? []) {
        if (s?.type === "gallery") {
          for (const img of s.images ?? []) {
            const url = img.url?.trim();
            if (url && !photos.some((p) => p.url === url)) photos.push({ url, alt: img.alt || "" });
          }
        } else if (s?.type === "values") {
          for (const it of s.items ?? []) push(highlights, it.title);
        } else if (s?.type === "use_cases" || s?.type === "services") {
          for (const it of s.items ?? []) push(projects, it.title);
        }
      }
    }
    return { photos, highlights, projects };
  }, [pageData, pages]);

  // Scroll-reveal: mark elements visible as they enter the viewport.
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
    root.querySelectorAll(".t3-reveal").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [motion, pageData]);

  return (
    <div ref={rootRef} className="template3" data-page={pageKind} style={themeStyle}>
        <TemplateFonts href={FONTS} />
      <T3Header
        businessName={profile.business_name}
        logoUrl={logoUrl}
        currentPage={navPage}
        currentExtraKey={currentExtraKey}
        baseUrl={baseUrl}
        profile={profile}
        navPages={navPages}
      />

      <main>
        <T3Sections
          pageData={pageData}
          profile={profile}
          pageKind={pageKind}
          pageLabel={pageLabel}
          pageNumber={pageNumber}
          heroData={heroData}
          navPages={navPages}
          baseUrl={baseUrl}
        />
        {slot}
      </main>

      <T3Footer
        businessName={profile.business_name}
        tagline={profile.tagline}
        address={profile.address}
        phone={profile.phone}
        email={profile.email}
        socials={socials}
        baseUrl={baseUrl}
        navPages={navPages}
      />
    </div>
  );
}
