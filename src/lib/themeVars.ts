import type { CSSProperties } from "react";
import { carriedDarkAccent, getTemplateThemeConfig, toCssVarMap } from "@/lib/templateTheme";

type BrandColors = {
  dominant: string;
  accent: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeCssColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  return s || null;
}

function normalizeHexColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toUpperCase();
}

function relativeLuminance(hex: string) {
  const m = hex.replace("#", "");
  const lin = (i: number) => {
    const v = parseInt(m.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
}

function getBrandColors(raw: unknown): BrandColors | null {
  if (!isRecord(raw)) return null;
  const dominant = normalizeHexColor(raw.dominant);
  const accent = normalizeHexColor(raw.accent);
  if (!dominant || !accent) return null;
  return { dominant, accent };
}

function getThemeOverride(rawThemeColors: unknown, templateKey: string): Record<string, string> | null {
  if (!isRecord(rawThemeColors)) return null;
  const perTemplate = rawThemeColors[templateKey];
  if (!isRecord(perTemplate)) return null;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(perTemplate)) {
    // Allow any CSS color strings (hex/rgb/rgba/hsl/var(...)).
    const c = normalizeCssColor(v);
    if (c) out[k] = c;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * CSS variables derived from logo ("Apply logo colors") brand colours.
 * Every template exposes `--tN-accent` and `--tN-accent2`; accent2 drives dark
 * bands with light text, so a logo's second colour is only used there when dark.
 */
export function brandColorVars(templateKey: string, brand: BrandColors): Record<string, string> {
  if (!/^t\d+$/.test(templateKey)) return {};
  const vars: Record<string, string> = { [`--${templateKey}-accent`]: brand.dominant };
  if (relativeLuminance(brand.accent) < 0.12) vars[`--${templateKey}-accent2`] = brand.accent;
  const darkAccentVar = getTemplateThemeConfig(templateKey)?.dark?.variables.accent;
  const carried = carriedDarkAccent(templateKey, { accent: brand.dominant });
  if (darkAccentVar && carried) vars[darkAccentVar] = carried;
  return vars;
}

/**
 * Returns inline CSS variables for a template root element.
 * - Uses `brand_colors` (from "Apply logo colors") as base.
 * - `theme_colors[templateKey]` (the palette editor) overrides specific variables.
 */
export function buildTemplateThemeStyle(
  templateKey: string,
  profile: { brand_colors?: unknown; theme_colors?: unknown },
): CSSProperties | undefined {
  const brand = getBrandColors(profile.brand_colors);
  const overrides = getThemeOverride(profile.theme_colors, templateKey);
  if (!brand && !overrides) return undefined;

  const style: Record<string, string> = {};
  if (brand) Object.assign(style, brandColorVars(templateKey, brand));
  if (overrides) Object.assign(style, toCssVarMap(templateKey, overrides));

  return Object.keys(style).length ? (style as CSSProperties) : undefined;
}
