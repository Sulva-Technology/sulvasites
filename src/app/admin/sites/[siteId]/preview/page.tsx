"use client";

import Link from "next/link";
import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { getTemplate, TEMPLATE_KEYS } from "@/templates/registry";
import ColorPaletteSidebar from "@/components/admin/ColorPaletteSidebar";
import { InlineEditorProvider } from "@/components/inline-editor/InlineEditorContext";
import { resolveSiteById } from "@/lib/siteResolver";
import type { SiteData } from "@/lib/siteResolver";
import { validatePageData, type PageKey, type Section } from "@/lib/pageSchema";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { getPublicAssetUrl } from "@/lib/assets";
import { extractLogoColors, type ExtractedLogoColors } from "@/lib/logoColors";
import { applyThemeColors, clearThemeColors, getTemplateThemeConfig, type ThemeSemanticColors } from "@/lib/templateTheme";
import { brandColorVars } from "@/lib/themeVars";

/** Root element of the rendered template inside the preview wrapper (every template uses .templateN). */
function previewRootFor(wrap: HTMLElement | null, templateKey: string): HTMLElement | null {
  if (!wrap) return null;
  const n = templateKey.replace(/^t/, "");
  return (wrap.querySelector(`.template${n}`) as HTMLElement | null) ?? wrap;
}

function applyBrandColors(root: HTMLElement, templateKey: string, colors: ExtractedLogoColors) {
  for (const [k, v] of Object.entries(brandColorVars(templateKey, colors))) root.style.setProperty(k, v);
}

function resetBrandColors(root: HTMLElement, templateKey: string) {
  clearThemeColors(root, templateKey);
}

export default function SitePreviewPage() {
  const params = useParams();
  const siteId = params?.siteId as string;

  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>("home");
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isApplyingBrand, setIsApplyingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<ExtractedLogoColors | null>(null);
  const [initialPaletteColors, setInitialPaletteColors] = useState<ThemeSemanticColors | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  const getPreviewRoot = () => {
    const wrap = previewWrapRef.current;
    const tk = siteData?.site?.template_key;
    if (!wrap || !tk) return wrap;

    return previewRootFor(wrap, tk);
  };

  const logoUrl = useMemo(() => {
    const path = siteData?.profile?.logo_path;
    return path ? getPublicAssetUrl(path) : null;
  }, [siteData?.profile?.logo_path]);

  // Load saved theme palette colors (manual color palette) from database
  useEffect(() => {
    const currentSiteData = siteData;
    if (!currentSiteData || !siteId) return;
    const tk = currentSiteData.site.template_key;
    if (!getTemplateThemeConfig(tk)) return;

    async function loadThemeColors() {
      try {
        const supabase = await getAuthenticatedClient();
        const { data, error } = await supabase
          .from("business_profiles")
          .select("theme_colors")
          .eq("site_id", siteId)
          .single();

        if (error) return;
        const raw = (data as { theme_colors?: unknown } | null)?.theme_colors;
        if (!raw || typeof raw !== "object") return;

        const perTemplate = (raw as Record<string, unknown>)[tk];
        if (!perTemplate || typeof perTemplate !== "object") return;

        const next: ThemeSemanticColors = {};
        for (const [k, v] of Object.entries(perTemplate as Record<string, unknown>)) {
          if (typeof v === "string") next[k] = v;
        }

        if (Object.keys(next).length === 0) return;
        setInitialPaletteColors(next);

        // Keep local storage in sync so sidebar UI reflects DB state immediately.
        try {
          localStorage.setItem(`template-${tk}-colors`, JSON.stringify(next));
        } catch {
          // ignore
        }

        // Actual DOM application is handled by the unified "apply" effect below.
      } catch {
        // ignore
      }
    }

    loadThemeColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteData, siteId]);

  // Load saved brand colors from database on mount and when siteData changes
  useEffect(() => {
    const currentSiteData = siteData;
    if (!currentSiteData || !siteId) return;
    const templateKey = currentSiteData.site.template_key;

    async function loadBrandColors() {
      try {
        const supabase = await getAuthenticatedClient();
        const { data, error } = await supabase
          .from("business_profiles")
          .select("brand_colors")
          .eq("site_id", siteId)
          .single();

        if (error) {
          // Not found or other error - ignore silently
          return;
        }

        if (data?.brand_colors) {
          const colors = data.brand_colors as ExtractedLogoColors;
          if (colors.dominant && colors.accent) {
            setBrandColors(colors);
          }
        }
      } catch {
        // Error loading - ignore silently
      }
    }

    loadBrandColors();
  }, [siteData, siteId]);

  // Apply theme in a deterministic order on reload:
  // 1) brand colors (from logo)
  // 2) palette overrides (saved theme colors)
  useEffect(() => {
    const tk = siteData?.site?.template_key;
    if (!siteData || !tk) return;
    const root = getPreviewRoot();
    if (!root) return;

    if (brandColors) applyBrandColors(root, tk, brandColors);
    if (initialPaletteColors) applyThemeColors(root, tk, initialPaletteColors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteData, brandColors, initialPaletteColors]);

  useEffect(() => {
    if (!siteId) {
      setError("Invalid site ID");
      setIsLoading(false);
      return;
    }

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await resolveSiteById(siteId);
        if (!data) {
          setError("Site not found");
          return;
        }
        setSiteData(data);
      } catch (err) {
        setError(formatSupabaseError(err));
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [siteId]);

  if (isLoading) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "14px", color: "#6B7280" }}>Loading preview...</div>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ 
          borderRadius: "8px", 
          border: "1px solid #FCA5A5", 
          backgroundColor: "#FEF2F2", 
          padding: "12px 16px", 
          fontSize: "14px", 
          color: "#B91C1C" 
        }}>
          {error || "Site not found"}
        </div>
      </div>
    );
  }

  const Template = getTemplate(siteData.site.template_key);

  async function saveThemeColors(templateKey: string, colors: ThemeSemanticColors) {
    const supabase = await getAuthenticatedClient();
    const { data } = await supabase
      .from("business_profiles")
      .select("theme_colors")
      .eq("site_id", siteId)
      .single();

    const existing = (data as { theme_colors?: unknown } | null)?.theme_colors;
    const nextTheme: Record<string, unknown> =
      existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};

    nextTheme[templateKey] = colors;

    const { error: upErr } = await supabase
      .from("business_profiles")
      .update({ theme_colors: nextTheme })
      .eq("site_id", siteId);

    if (upErr) {
      const msg = formatSupabaseError(upErr) ?? "";
      if (msg.toLowerCase().includes("theme_colors") && msg.toLowerCase().includes("does not exist")) {
        throw new Error('Missing DB column "business_profiles.theme_colors". Run supabase/migrations/003_add_theme_colors_column.sql in Supabase.');
      }
      throw new Error(msg || "Failed to save colors.");
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "auto", position: "relative" }}>
      {/* Floating Page Selector */}
      <div
        className="fixed left-1/2 top-4 z-[999] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-[1.75rem] border border-white/15 bg-koi-ink/80 p-1.5 font-sans text-white shadow-[0_12px_40px_-12px_rgba(10,15,31,.6)] backdrop-blur-xl"
      >
        <button
          onClick={() => setCurrentPage("home")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange ${currentPage === "home" ? "bg-white text-koi-ink" : "text-white/85 hover:bg-white/15 hover:text-white"}`}
        >
          Home
        </button>
        <button
          onClick={() => setCurrentPage("about")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange ${currentPage === "about" ? "bg-white text-koi-ink" : "text-white/85 hover:bg-white/15 hover:text-white"}`}
        >
          About
        </button>
        <button
          onClick={() => setCurrentPage("contact")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange ${currentPage === "contact" ? "bg-white text-koi-ink" : "text-white/85 hover:bg-white/15 hover:text-white"}`}
        >
          Contact
        </button>
        <Link
          href={`/admin/sites/${siteId}`}
          className="ml-1 rounded-full px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
        >
          Back
        </Link>

        <div aria-hidden="true" className="mx-1 h-6 w-px bg-white/20" />

        <button
          onClick={() => {
            setSaveError(null);
            setSaveSuccess(false);
            setEditMode((v) => !v);
          }}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange ${editMode ? "bg-koi-orange text-white" : "text-white ring-1 ring-white/25 hover:bg-white/15"}`}
        >
          {editMode ? "Editing" : "Edit"}
        </button>

        <button
          onClick={async () => {
            if (!siteData) return;
            setBrandError(null);

            if (!logoUrl) {
              setBrandError("Upload a logo first to extract brand colors.");
              return;
            }

            setIsApplyingBrand(true);
            try {
              const colors = await extractLogoColors(logoUrl);
              setBrandColors(colors);

              // Save to database
              const supabase = await getAuthenticatedClient();
              const { error: dbError } = await supabase
                .from("business_profiles")
                .update({ brand_colors: colors })
                .eq("site_id", siteId);

              if (dbError) {
                throw dbError;
              }

              const wrap = previewWrapRef.current;
              const tk = siteData.site.template_key;
              const root = previewRootFor(wrap ?? null, tk);

              if (!root) throw new Error("Preview not ready.");

              applyBrandColors(root, tk, colors);
            } catch (err) {
              setBrandError(formatSupabaseError(err));
            } finally {
              setIsApplyingBrand(false);
            }
          }}
          disabled={isApplyingBrand}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange bg-white text-koi-ink hover:bg-white/90 ${isApplyingBrand ? "opacity-70" : ""}`}
          title={logoUrl ? "Extract dominant + accent colors from the uploaded logo" : "Upload a logo first"}
        >
          {isApplyingBrand ? "Applying…" : "Apply logo colors"}
        </button>

        {brandColors ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: brandColors.dominant, border: "1px solid rgba(255,255,255,0.4)" }} />
            <div style={{ width: 12, height: 12, borderRadius: 3, background: brandColors.accent, border: "1px solid rgba(255,255,255,0.4)" }} />
            <button
              onClick={async () => {
                if (!siteData) return;
                setBrandError(null);
                setBrandColors(null);

                // Remove from database
                try {
                  const supabase = await getAuthenticatedClient();
                  await supabase
                    .from("business_profiles")
                    .update({ brand_colors: null })
                    .eq("site_id", siteId);
                } catch (err) {
                  // Ignore errors on reset
                }

                const wrap = previewWrapRef.current;
                const tk = siteData.site.template_key;
                const root = previewRootFor(wrap ?? null, tk);

                if (!root) return;

                resetBrandColors(root, tk);
              }}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
            >
              Reset
            </button>
          </div>
        ) : null}

        {editMode && (
          <>
            <button
              onClick={async () => {
                if (!siteData) return;
                setIsSaving(true);
                setSaveError(null);
                setSaveSuccess(false);
                try {
                  const draft = siteData.pages[currentPage];
                  const valid = validatePageData(draft);
                  if (!valid.ok) {
                    setSaveError(valid.error ?? "Invalid page data.");
                    return;
                  }

                  // Ensure client is fully authenticated before making database call
                  const supabase = await getAuthenticatedClient();
                  const { error: err } = await supabase
                    .from("pages")
                    .update({ data: draft, status: "draft" })
                    .eq("site_id", siteId)
                    .eq("key", currentPage);

                  if (err) throw err;
                  setSaveSuccess(true);
                } catch (err) {
                  setSaveError(formatSupabaseError(err));
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange bg-koi-sea text-white hover:bg-koi-deep ${isSaving ? "opacity-70" : ""}`}
            >
              {isSaving ? "Saving…" : "Save Draft"}
            </button>

            <div className="px-2 text-xs text-white/70">
              Click text to edit
            </div>
          </>
        )}
      </div>

      {/* Save toast */}
      {saveError ? (
        <div
          style={{
            position: "fixed",
            top: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            borderRadius: 10,
            border: "1px solid #FCA5A5",
            backgroundColor: "#FEF2F2",
            padding: "10px 12px",
            fontSize: 13,
            color: "#B91C1C",
            maxWidth: 720,
          }}
        >
          {saveError}
        </div>
      ) : null}
      {saveSuccess ? (
        <div
          style={{
            position: "fixed",
            top: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            borderRadius: 10,
            border: "1px solid #86EFAC",
            backgroundColor: "#ECFDF5",
            padding: "10px 12px",
            fontSize: 13,
            color: "#065F46",
          }}
        >
          Draft saved.
        </div>
      ) : null}
      {brandError ? (
        <div
          style={{
            position: "fixed",
            top: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            borderRadius: 10,
            border: "1px solid #FCA5A5",
            backgroundColor: "#FEF2F2",
            padding: "10px 12px",
            fontSize: 13,
            color: "#B91C1C",
            maxWidth: 720,
          }}
        >
          {brandError}
        </div>
      ) : null}

      {/* Template Preview - Full Screen */}
      <div ref={previewWrapRef}>
        <InlineEditorProvider
          value={{
            enabled: editMode,
            pageKey: currentPage,
            pageData: siteData.pages[currentPage],
            updateSection: (sectionIndex: number, next: Section) => {
              setSiteData((prev) => {
                if (!prev) return prev;
                const page = prev.pages[currentPage];
                const sections = page.sections.map((s, i) => (i === sectionIndex ? next : s));
                return {
                  ...prev,
                  pages: {
                    ...prev.pages,
                    [currentPage]: { ...page, sections },
                  },
                };
              });
            },
            updateSectionField: (sectionIndex: number, field: string, value: unknown) => {
              setSiteData((prev) => {
                if (!prev) return prev;
                const page = prev.pages[currentPage];
                const section = page.sections[sectionIndex] as Record<string, unknown>;
                const nextSection = { ...(section as object), [field]: value } as unknown as Section;
                const sections = page.sections.map((s, i) => (i === sectionIndex ? nextSection : s));
                return {
                  ...prev,
                  pages: {
                    ...prev.pages,
                    [currentPage]: { ...page, sections },
                  },
                };
              });
            },
            updateProfileField: async (field: string, value: unknown) => {
              if (!siteId) return;
              try {
                const supabase = await getAuthenticatedClient();
                const { error } = await supabase
                  .from("business_profiles")
                  .update({ [field]: value })
                  .eq("site_id", siteId);
                
                if (error) {
                  console.error("Failed to update profile field:", error);
                  return;
                }

                // Update local state
                setSiteData((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    profile: {
                      ...prev.profile,
                      [field]: value,
                    },
                  };
                });
              } catch (err) {
                console.error("Error updating profile field:", err);
              }
            },
          }}
        >
          {Template &&
            createElement(Template, {
              site: siteData.site,
              profile: siteData.profile,
              pages: siteData.pages,
              currentPage,
              baseUrl: "",
            })}
          {Template && (
            <ColorPaletteSidebar
              isOpen={colorPaletteOpen}
              onClose={() => setColorPaletteOpen(!colorPaletteOpen)}
              templateKey={siteData.site.template_key}
              initialColors={initialPaletteColors}
              getTargetRoot={getPreviewRoot}
              onSaveColors={(colors) => saveThemeColors(siteData.site.template_key, colors)}
            />
          )}
        </InlineEditorProvider>
      </div>
      {!Template && (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "18px", fontWeight: "600", color: "#1F2937" }}>
              Template {siteData.site.template_key.toUpperCase()} not yet implemented
            </p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#6B7280" }}>
              Available templates: {TEMPLATE_KEYS.join(", ")}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
