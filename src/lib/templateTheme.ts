/**
 * Palette editor configuration. Every template exposes the same six semantic
 * colours as CSS variables (`--tN-accent`, `--tN-accent2`, `--tN-ink`,
 * `--tN-muted`, `--tN-bg`, `--tN-surface`); lines and tints are derived in CSS.
 * Defaults here must match each template's CSS.
 */

export type ThemeSemanticColors = Record<string, string>;

export type TemplateThemeConfig = {
  defaults: ThemeSemanticColors;
  variables: Record<string, string>;
  labels: Record<string, string>;
  /**
   * Dark-mode palette for templates with a light/dark toggle. Saved under `dark_<key>`
   * and emitted as `--tN-dark-<key>`; the template's `[data-mode="dark"]` block reads
   * them with its own values as fallback. Keys missing here aren't re-mapped in dark mode.
   */
  dark?: { defaults: ThemeSemanticColors; variables: Record<string, string> };
};

/** Prefix for dark-mode keys in a saved palette (`dark_bg`, `dark_accent`, ...). */
export const DARK_PREFIX = "dark_";

const SEMANTIC_KEYS = ["accent", "accent2", "ink", "muted", "bg", "surface"] as const;
type SemanticKey = (typeof SEMANTIC_KEYS)[number];

function config(
  key: string,
  defaults: Record<SemanticKey, string>,
  labels: Partial<Record<SemanticKey, string>> = {},
): TemplateThemeConfig {
  const baseLabels: Record<SemanticKey, string> = {
    accent: "Accent (buttons, links)",
    accent2: "Dark sections & footer",
    ink: "Text",
    muted: "Muted text",
    bg: "Page background",
    surface: "Cards / panels",
  };
  return {
    defaults,
    variables: Object.fromEntries(SEMANTIC_KEYS.map((k) => [k, `--${key}-${k}`])),
    labels: { ...baseLabels, ...labels },
  };
}

export const TEMPLATE_THEME_CONFIGS: Record<string, TemplateThemeConfig> = {
  // Corporate — "Meridian"
  t1: config("t1", {
    accent: "#0ea58c",
    accent2: "#0b1220",
    ink: "#0b1220",
    muted: "#66707f",
    bg: "#ffffff",
    surface: "#f4f5f7",
  }, { surface: "Grey sections" }),
  // Editorial — "Journal"
  t2: config("t2", {
    accent: "#9e1b3c",
    accent2: "#141212",
    ink: "#141212",
    muted: "#6b6562",
    bg: "#ffffff",
    surface: "#f5f0ea",
  }, { accent2: "Black sections & footer", surface: "Paper sections" }),
  // Portfolio — "Atelier"
  t3: config("t3", {
    accent: "#3d6bff",
    accent2: "#14151a",
    ink: "#121317",
    muted: "#6b6e76",
    bg: "#f6f6f3",
    surface: "#ffffff",
  }, { accent2: "Band / cover colour", bg: "Paper background" }),
  // Product — "Launch"
  t4: config("t4", {
    accent: "#6c5cff",
    accent2: "#0c0e1a",
    ink: "#0c0e1a",
    muted: "#5c6178",
    bg: "#f7f8fc",
    surface: "#ffffff",
  }),
  // Glam / booking — "Maison"
  t5: config("t5", {
    accent: "#d0567b",
    accent2: "#221a1f",
    ink: "#1f1a1d",
    muted: "#6f6670",
    bg: "#faf7f5",
    surface: "#ffffff",
  }),
  // Real estate — "Estate"
  t6: config("t6", {
    accent: "#3e6b48",
    accent2: "#161615",
    ink: "#141413",
    muted: "#6d6c68",
    bg: "#ffffff",
    surface: "#f3f2ee",
  }),
  // Restaurant — "Tavola"
  t7: config("t7", {
    accent: "#c2512e",
    accent2: "#16110e",
    ink: "#1a1412",
    muted: "#6f655e",
    bg: "#f6f3ee",
    surface: "#ece6dc",
  }, { accent2: "Dark bands & footer", surface: "Menu cards / panels" }),
  // Clinic / health — "Vital"
  t8: config("t8", {
    accent: "#0f8a7e",
    accent2: "#0d2b33",
    ink: "#10262c",
    muted: "#5d7178",
    bg: "#ffffff",
    surface: "#eef6f4",
  }, { accent2: "Dark bands & footer", surface: "Mint cards / panels" }),
  // Fitness — "Pulse"
  t9: config("t9", {
    accent: "#e5322d",
    accent2: "#0b0b0c",
    ink: "#111112",
    muted: "#6a6a70",
    bg: "#ffffff",
    surface: "#f2f2f3",
  }, { accent2: "Black bands & footer", surface: "Cards / panels" }),
  // Education — "Campus"
  t10: config("t10", {
    accent: "#2747d6",
    accent2: "#121a3a",
    ink: "#141b33",
    muted: "#5d6582",
    bg: "#fffdf7",
    surface: "#f4f1e6",
  }, { accent2: "Navy bands & footer", surface: "Cards / panels" }),
  // Events — "Soirée"
  t11: config("t11", {
    accent: "#7b2ff7",
    accent2: "#1b0f2e",
    ink: "#1a1225",
    muted: "#6c6177",
    bg: "#fdf8ff",
    surface: "#f3ebfb",
  }, { accent2: "Plum bands & footer", surface: "Cards / panels" }),
  // Trades & construction — "Forge"
  t12: config("t12", {
    accent: "#f26b1d",
    accent2: "#1d2124",
    ink: "#1b1e21",
    muted: "#646b71",
    bg: "#f6f5f2",
    surface: "#ffffff",
  }, { accent2: "Charcoal bands & footer", surface: "Cards / panels" }),
  // Fashion shop — "Mode" (cinematic, dark-first; these are the paper-mode values)
  t13: config("t13", {
    accent: "#6d5efc",
    accent2: "#0a0a0b",
    ink: "#111113",
    muted: "#5d6069",
    bg: "#f6f5f2",
    surface: "#ecebe7",
  }, { accent2: "Night bands & footer", surface: "Cards / panels" }),
  // General store — "Cartly" (quiet, product-first)
  t14: config("t14", {
    accent: "#2563eb",
    accent2: "#0a0a0a",
    ink: "#0a0a0a",
    muted: "#6b6b6b",
    bg: "#ffffff",
    surface: "#f5f5f5",
  }, { accent2: "Buttons & dark bands", surface: "Paper cards / panels" }),
};

// Dark-mode values — must match each template's `[data-mode="dark"]` fallbacks (test enforces).
const DARK_DEFAULTS: Record<string, Partial<Record<SemanticKey, string>>> = {
  t4: { accent2: "#12152a", ink: "#eef0fb", muted: "#9aa0ba", bg: "#05060c", surface: "#0e1120" },
  t5: { accent2: "#2a1f26", ink: "#f6eef2", muted: "#b4a7b0", bg: "#120d10", surface: "#1c1519" },
  t6: { accent2: "#1d1d1b", ink: "#f1f0eb", muted: "#a3a29c", bg: "#0f0f0e", surface: "#1a1a18" },
  t7: { accent: "#e9875c", accent2: "#120e0b", ink: "#f5efe6", muted: "#a89d92", bg: "#0b0908", surface: "#16120f" },
  t8: { accent: "#4fd1b5", accent2: "#061a20", ink: "#e3f1ee", muted: "#9bb4b6", bg: "#0b2129", surface: "#0f2c35" },
  t9: { accent: "#ff3b35", accent2: "#0f0f10", ink: "#f4f4f5", muted: "#a1a1a9", bg: "#000000", surface: "#0d0d0e" },
  t10: { accent: "#8ea3ff", accent2: "#090f29", ink: "#f4f2ea", muted: "#aab2d0", bg: "#0e1533", surface: "#131c40" },
  t11: { accent: "#b18cff", accent2: "#0c0616", ink: "#f6effc", muted: "#b9a9cc", bg: "#130a22", surface: "#1c1030" },
  t12: { accent: "#ff8a3d", accent2: "#0e1011", ink: "#eef0f1", muted: "#a3abb1", bg: "#16191b", surface: "#1f2326" },
  t13: { ink: "#f4f4f5", muted: "#9ea3ad", bg: "#0a0a0b", surface: "#111113" },
  t14: { ink: "#f5f5f5", muted: "#a1a1a1", bg: "#0a0a0a", surface: "#141414" },
};

for (const [key, defaults] of Object.entries(DARK_DEFAULTS)) {
  TEMPLATE_THEME_CONFIGS[key].dark = {
    defaults: defaults as ThemeSemanticColors,
    variables: Object.fromEntries(Object.keys(defaults).map((k) => [k, `--${key}-dark-${k}`])),
  };
}

export function getTemplateThemeConfig(templateKey: string): TemplateThemeConfig | null {
  return TEMPLATE_THEME_CONFIGS[templateKey] ?? null;
}

export function toCssVarMap(templateKey: string, colors: ThemeSemanticColors): Record<string, string> {
  const cfg = getTemplateThemeConfig(templateKey);
  if (!cfg) return {};

  const cssVars: Record<string, string> = {};
  for (const [semanticKey, value] of Object.entries(colors)) {
    if (typeof value !== "string") continue;
    const cssVar = semanticKey.startsWith(DARK_PREFIX)
      ? cfg.dark?.variables[semanticKey.slice(DARK_PREFIX.length)]
      : cfg.variables[semanticKey];
    if (cssVar) cssVars[cssVar] = value;
  }
  const carried = carriedDarkAccent(templateKey, colors);
  if (carried && cfg.dark?.variables.accent) cssVars[cfg.dark.variables.accent] = carried;
  return cssVars;
}

function hexLuminance(input: string | undefined): number | null {
  const m = typeof input === "string" ? input.trim().match(/^#([0-9a-f]{6})$/i) : null;
  if (!m) return null;
  const lin = (i: number) => {
    const v = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
}

/**
 * When the owner picked a light-mode accent but no dark one, reuse it in dark mode
 * if it stays readable (>= 3:1) on the dark background — keeps the brand colour.
 */
export function carriedDarkAccent(templateKey: string, colors: ThemeSemanticColors): string | null {
  const dark = getTemplateThemeConfig(templateKey)?.dark;
  if (!dark?.defaults.accent || !colors.accent || colors[`${DARK_PREFIX}accent`]) return null;
  const a = hexLuminance(colors.accent);
  const b = hexLuminance(colors[`${DARK_PREFIX}bg`] ?? dark.defaults.bg);
  if (a == null || b == null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3 ? colors.accent : null;
}

/** Dark-mode colours the editor should show: saved value, else carried accent, else default. */
export function effectiveDarkColors(templateKey: string, colors: ThemeSemanticColors): ThemeSemanticColors {
  const dark = getTemplateThemeConfig(templateKey)?.dark;
  if (!dark) return {};
  const carried = carriedDarkAccent(templateKey, colors);
  const out: ThemeSemanticColors = {};
  for (const [k, v] of Object.entries(dark.defaults)) {
    out[k] = colors[`${DARK_PREFIX}${k}`] ?? (k === "accent" && carried ? carried : v);
  }
  return out;
}

export function applyThemeColors(root: HTMLElement, templateKey: string, colors: ThemeSemanticColors) {
  const vars = toCssVarMap(templateKey, colors);
  // Drop dark vars the palette no longer sets (e.g. after Reset); a logo-carried
  // dark accent stays unless this palette has its own accent.
  for (const [k, cssVar] of Object.entries(getTemplateThemeConfig(templateKey)?.dark?.variables ?? {})) {
    if (!(cssVar in vars) && (k !== "accent" || colors.accent)) root.style.removeProperty(cssVar);
  }
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function clearThemeColors(root: HTMLElement, templateKey: string) {
  const cfg = getTemplateThemeConfig(templateKey);
  if (!cfg) return;
  for (const cssVar of Object.values(cfg.variables)) root.style.removeProperty(cssVar);
  for (const cssVar of Object.values(cfg.dark?.variables ?? {})) root.style.removeProperty(cssVar);
}
