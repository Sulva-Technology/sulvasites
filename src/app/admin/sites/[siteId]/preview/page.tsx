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
import { applyThemeColors, type ThemeSemanticColors } from "@/lib/templateTheme";

function hexToRgba(hex: string, alpha: number) {
  const m = hex.trim().replace("#", "");
  if (m.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string) {
  const m = hex.trim().replace("#", "");
  if (m.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function darken(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: Math.max(0, rgb.r * (1 - amount)),
    g: Math.max(0, rgb.g * (1 - amount)),
    b: Math.max(0, rgb.b * (1 - amount)),
  });
}

function lighten(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: Math.min(255, rgb.r + (255 - rgb.r) * amount),
    g: Math.min(255, rgb.g + (255 - rgb.g) * amount),
    b: Math.min(255, rgb.b + (255 - rgb.b) * amount),
  });
}

function applyBrandColors(
  root: HTMLElement,
  templateKey: string,
  colors: ExtractedLogoColors,
) {
  const { dominant, accent } = colors;

  if (templateKey === "t1") {
    // Template1: Comprehensive color system
    root.style.setProperty("--color-primary", dominant);
    root.style.setProperty("--color-primary-dark", darken(dominant, 0.15));
    root.style.setProperty("--color-primary-light", lighten(dominant, 0.2));
    root.style.setProperty("--color-accent", accent);
    root.style.setProperty("--color-accent-light", lighten(accent, 0.15));
    root.style.setProperty("--color-dark", darken(dominant, 0.4));
    
    // Derive text colors from dominant (ensure good contrast)
    const dominantRgb = hexToRgb(dominant);
    const dominantLuma = 0.2126 * dominantRgb.r + 0.7152 * dominantRgb.g + 0.0722 * dominantRgb.b;
    if (dominantLuma > 128) {
      // Light color - use dark text
      root.style.setProperty("--color-text-primary", "#0F172A");
      root.style.setProperty("--color-text-secondary", "#64748B");
    } else {
      // Dark color - use light text
      root.style.setProperty("--color-text-primary", "#F8FAFC");
      root.style.setProperty("--color-text-secondary", "#CBD5E1");
    }
    
    // Backgrounds stay neutral for readability
    root.style.setProperty("--color-bg-main", "#FFFFFF");
    root.style.setProperty("--color-bg-light", "#F8FAFC");
    root.style.setProperty("--color-bg-dark", darken(dominant, 0.5));
    
    // Borders derived from dominant (subtle)
    root.style.setProperty("--color-border", hexToRgba(dominant, 0.15));
    root.style.setProperty("--color-border-light", hexToRgba(dominant, 0.08));
    
    // Shadows with brand color glow
    root.style.setProperty("--shadow-glow", `0 0 20px ${hexToRgba(dominant, 0.30)}`);
    root.style.setProperty("--shadow-glow-lg", `0 0 40px ${hexToRgba(dominant, 0.40)}`);
    
    // Gradient
    root.style.setProperty("--color-bg-gradient", `linear-gradient(135deg, ${dominant} 0%, ${accent} 100%)`);
  }

  if (templateKey === "t3") {
    // Redesigned template: text/background/lines are derived in CSS from these via color-mix().
    root.style.setProperty("--t3-accent", dominant);
    root.style.setProperty("--t3-accent2", accent);
  }

  if (templateKey === "t4") {
    root.style.setProperty("--t4-accent", dominant);
    root.style.setProperty("--t4-accent2", accent);
    root.style.setProperty("--t4-accent-rgb", `${hexToRgb(dominant).r} ${hexToRgb(dominant).g} ${hexToRgb(dominant).b}`);
    root.style.setProperty("--t4-accent2-rgb", `${hexToRgb(accent).r} ${hexToRgb(accent).g} ${hexToRgb(accent).b}`);
    root.style.setProperty("--t4-ring", hexToRgba(dominant, 0.22));
    
    // Template4 is dark theme - keep light text
    root.style.setProperty("--t4-ink", "rgba(255, 255, 255, 0.92)");
    root.style.setProperty("--t4-muted", "rgba(255, 255, 255, 0.66)");
    
    // Dark background with brand color hints
    root.style.setProperty("--t4-bg", "#0b0f19");
    root.style.setProperty("--t4-surface", hexToRgba(dominant, 0.06));
    root.style.setProperty("--t4-surface-2", hexToRgba(dominant, 0.08));
    root.style.setProperty("--t4-border", hexToRgba(dominant, 0.12));
  }

  if (templateKey === "t5") {
    root.style.setProperty("--t5-accent", dominant);
    root.style.setProperty("--t5-accent2", accent);
    root.style.setProperty("--t5-accent-rgb", `${hexToRgb(dominant).r} ${hexToRgb(dominant).g} ${hexToRgb(dominant).b}`);
    root.style.setProperty("--t5-accent2-rgb", `${hexToRgb(accent).r} ${hexToRgb(accent).g} ${hexToRgb(accent).b}`);
    root.style.setProperty("--t5-ring", hexToRgba(dominant, 0.18));
    
    // Derive text colors
    const dominantRgb = hexToRgb(dominant);
    const dominantLuma = 0.2126 * dominantRgb.r + 0.7152 * dominantRgb.g + 0.0722 * dominantRgb.b;
    if (dominantLuma > 128) {
      root.style.setProperty("--t5-ink", "#0b1220");
      root.style.setProperty("--t5-muted", "rgba(11, 18, 32, 0.62)");
    } else {
      root.style.setProperty("--t5-ink", "#F8FAFC");
      root.style.setProperty("--t5-muted", "rgba(248, 250, 252, 0.62)");
    }
    
    // Light backgrounds
    root.style.setProperty("--t5-bg", "#f7f8fb");
    root.style.setProperty("--t5-surface", "#ffffff");
    root.style.setProperty("--t5-border", hexToRgba(dominant, 0.12));
  }

  if (templateKey === "t6") {
    // Redesigned template: text/background/lines are derived in CSS from these via color-mix().
    root.style.setProperty("--t6-accent", dominant);
    root.style.setProperty("--t6-accent2", accent);
  }
}

function applyThemePalette(root: HTMLElement, templateKey: string, colors: ThemeSemanticColors) {
  applyThemeColors(root, templateKey, colors);

  // Keep derived RGB vars in sync for gradients/glows.
  const setRgb = (cssVar: string, hex: string) => {
    const m = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(m)) return;
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    root.style.setProperty(cssVar, `${r} ${g} ${b}`);
  };

  if (templateKey === "t3") {
    if (typeof colors.accent === "string") setRgb("--t3-accent-rgb", colors.accent);
    if (typeof colors.accent2 === "string") setRgb("--t3-accent2-rgb", colors.accent2);
  }
  if (templateKey === "t4") {
    if (typeof colors.accent === "string") setRgb("--t4-accent-rgb", colors.accent);
    if (typeof colors.accent2 === "string") setRgb("--t4-accent2-rgb", colors.accent2);
  }
  if (templateKey === "t5") {
    if (typeof colors.accent === "string") setRgb("--t5-accent-rgb", colors.accent);
    if (typeof colors.accent2 === "string") setRgb("--t5-accent2-rgb", colors.accent2);
  }
  if (templateKey === "t6") {
    if (typeof colors.accent === "string") setRgb("--t6-accent-rgb", colors.accent);
    if (typeof colors.accent2 === "string") setRgb("--t6-accent2-rgb", colors.accent2);
  }
}

function resetBrandColors(root: HTMLElement, templateKey: string) {
  if (templateKey === "t1") {
    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--color-primary-dark");
    root.style.removeProperty("--color-primary-light");
    root.style.removeProperty("--color-accent");
    root.style.removeProperty("--color-accent-light");
    root.style.removeProperty("--color-dark");
    root.style.removeProperty("--color-text-primary");
    root.style.removeProperty("--color-text-secondary");
    root.style.removeProperty("--color-bg-main");
    root.style.removeProperty("--color-bg-light");
    root.style.removeProperty("--color-bg-dark");
    root.style.removeProperty("--color-border");
    root.style.removeProperty("--color-border-light");
    root.style.removeProperty("--shadow-glow");
    root.style.removeProperty("--shadow-glow-lg");
    root.style.removeProperty("--color-bg-gradient");
  }
  if (templateKey === "t3") {
    root.style.removeProperty("--t3-accent");
    root.style.removeProperty("--t3-accent2");
    root.style.removeProperty("--t3-ring");
    root.style.removeProperty("--t3-ink");
    root.style.removeProperty("--t3-muted");
    root.style.removeProperty("--t3-bg");
    root.style.removeProperty("--t3-surface");
    root.style.removeProperty("--t3-border");
  }
  if (templateKey === "t4") {
    root.style.removeProperty("--t4-accent");
    root.style.removeProperty("--t4-accent2");
    root.style.removeProperty("--t4-ring");
    root.style.removeProperty("--t4-ink");
    root.style.removeProperty("--t4-muted");
    root.style.removeProperty("--t4-bg");
    root.style.removeProperty("--t4-surface");
    root.style.removeProperty("--t4-surface-2");
    root.style.removeProperty("--t4-border");
  }
  if (templateKey === "t5") {
    root.style.removeProperty("--t5-accent");
    root.style.removeProperty("--t5-accent2");
    root.style.removeProperty("--t5-ring");
    root.style.removeProperty("--t5-ink");
    root.style.removeProperty("--t5-muted");
    root.style.removeProperty("--t5-bg");
    root.style.removeProperty("--t5-surface");
    root.style.removeProperty("--t5-border");
  }
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

    const root = (
      (tk === "t1"
        ? wrap.querySelector(".template1-container")
        : tk === "t3"
          ? wrap.querySelector(".template3")
          : tk === "t4"
            ? wrap.querySelector(".template4")
            : tk === "t5"
              ? wrap.querySelector(".template5")
              : tk === "t6"
                ? wrap.querySelector(".template6")
                : null) ?? wrap
    ) as HTMLElement | null;

    return root;
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
    if (!["t1", "t3", "t4", "t5", "t6"].includes(tk)) return;

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
    if (initialPaletteColors) applyThemePalette(root, tk, initialPaletteColors);
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
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          display: "flex",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setCurrentPage("home")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: currentPage === "home" ? "#6B46C1" : "transparent",
            color: currentPage === "home" ? "#FFFFFF" : "#1F2937",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          Home
        </button>
        <button
          onClick={() => setCurrentPage("about")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: currentPage === "about" ? "#6B46C1" : "transparent",
            color: currentPage === "about" ? "#FFFFFF" : "#1F2937",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          About
        </button>
        <button
          onClick={() => setCurrentPage("contact")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: currentPage === "contact" ? "#6B46C1" : "transparent",
            color: currentPage === "contact" ? "#FFFFFF" : "#1F2937",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          Contact
        </button>
        <Link
          href={`/admin/sites/${siteId}`}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
            background: "transparent",
            color: "#1F2937",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            marginLeft: "8px",
          }}
        >
          Back
        </Link>

        <div style={{ width: 1, height: 24, background: "#E5E7EB", marginLeft: 8 }} />

        <button
          onClick={() => {
            setSaveError(null);
            setSaveSuccess(false);
            setEditMode((v) => !v);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
            background: editMode ? "#111827" : "transparent",
            color: editMode ? "#FFFFFF" : "#111827",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
          }}
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
              const root = (
                (tk === "t1"
                  ? wrap?.querySelector(".template1-container")
                  : tk === "t3"
                    ? wrap?.querySelector(".template3")
                    : tk === "t4"
                      ? wrap?.querySelector(".template4")
                      : tk === "t5"
                        ? wrap?.querySelector(".template5")
                        : tk === "t6"
                          ? wrap?.querySelector(".template6")
                      : null) ?? wrap
              ) as HTMLElement | null;

              if (!root) throw new Error("Preview not ready.");

              applyBrandColors(root, tk, colors);
            } catch (err) {
              setBrandError(formatSupabaseError(err));
            } finally {
              setIsApplyingBrand(false);
            }
          }}
          disabled={isApplyingBrand}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#111827",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
            opacity: isApplyingBrand ? 0.7 : 1,
          }}
          title={logoUrl ? "Extract dominant + accent colors from the uploaded logo" : "Upload a logo first"}
        >
          {isApplyingBrand ? "Applying…" : "Apply logo colors"}
        </button>

        {brandColors ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: brandColors.dominant, border: "1px solid rgba(0,0,0,0.10)" }} />
            <div style={{ width: 12, height: 12, borderRadius: 3, background: brandColors.accent, border: "1px solid rgba(0,0,0,0.10)" }} />
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
                const root = (
                  (tk === "t1"
                    ? wrap?.querySelector(".template1-container")
                    : tk === "t3"
                      ? wrap?.querySelector(".template3")
                      : tk === "t4"
                        ? wrap?.querySelector(".template4")
                        : tk === "t5"
                          ? wrap?.querySelector(".template5")
                          : tk === "t6"
                            ? wrap?.querySelector(".template6")
                        : null) ?? wrap
                ) as HTMLElement | null;

                if (!root) return;

                resetBrandColors(root, tk);
              }}
              style={{
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #E5E7EB",
                background: "transparent",
                color: "#6B7280",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
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
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#6B46C1",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 700,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save Draft"}
            </button>

            <div style={{ fontSize: 12, color: "#6B7280", marginLeft: 6 }}>
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
          {/* Template2 uses Tailwind CSS, color palette not applicable */}
          {Template && siteData.site.template_key !== "t2" && (
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
