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
};

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
    accent: "#b5452b",
    accent2: "#2a1712",
    ink: "#231815",
    muted: "#75655c",
    bg: "#fbf6ee",
    surface: "#f2e8d9",
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
  // Fashion boutique shop — "Mode"
  t13: config("t13", {
    accent: "#b4532a",
    accent2: "#121212",
    ink: "#121212",
    muted: "#6e6a66",
    bg: "#fbfaf7",
    surface: "#f1eee8",
  }, { accent2: "Black bands & footer", surface: "Cards / panels" }),
};

export function getTemplateThemeConfig(templateKey: string): TemplateThemeConfig | null {
  return TEMPLATE_THEME_CONFIGS[templateKey] ?? null;
}

export function toCssVarMap(templateKey: string, colors: ThemeSemanticColors): Record<string, string> {
  const cfg = getTemplateThemeConfig(templateKey);
  if (!cfg) return {};

  const cssVars: Record<string, string> = {};
  for (const [semanticKey, value] of Object.entries(colors)) {
    const cssVar = cfg.variables[semanticKey];
    if (cssVar && typeof value === "string") cssVars[cssVar] = value;
  }
  return cssVars;
}

export function applyThemeColors(root: HTMLElement, templateKey: string, colors: ThemeSemanticColors) {
  for (const [k, v] of Object.entries(toCssVarMap(templateKey, colors))) {
    root.style.setProperty(k, v);
  }
}

export function clearThemeColors(root: HTMLElement, templateKey: string) {
  const cfg = getTemplateThemeConfig(templateKey);
  if (!cfg) return;
  for (const cssVar of Object.values(cfg.variables)) root.style.removeProperty(cssVar);
}
