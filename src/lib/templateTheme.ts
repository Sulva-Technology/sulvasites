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
    accent: "#0e8a74",
    accent2: "#0f1e2e",
    ink: "#0f1e2e",
    muted: "#58677a",
    bg: "#ffffff",
    surface: "#f3f6f8",
  }, { surface: "Grey sections" }),
  // Editorial — "Journal"
  t2: config("t2", {
    accent: "#e4322b",
    accent2: "#111111",
    ink: "#111111",
    muted: "#5c5c5c",
    bg: "#ffffff",
    surface: "#f4f1ea",
  }, { accent2: "Black sections & footer", surface: "Paper sections" }),
  // Portfolio — "Atelier"
  t3: config("t3", {
    accent: "#b4532a",
    accent2: "#1f3a34",
    ink: "#1b1a17",
    muted: "#6e685f",
    bg: "#f4efe7",
    surface: "#fffdf9",
  }, { accent2: "Band / cover colour", bg: "Paper background" }),
  // Product — "Launch"
  t4: config("t4", {
    accent: "#ff5a1f",
    accent2: "#121216",
    ink: "#121216",
    muted: "#62626c",
    bg: "#fafaf7",
    surface: "#ffffff",
  }),
  // Glam / booking — "Maison"
  t5: config("t5", {
    accent: "#c46f86",
    accent2: "#2b1b2f",
    ink: "#2b1b2f",
    muted: "#75687a",
    bg: "#fbf7f4",
    surface: "#ffffff",
  }),
  // Real estate — "Estate"
  t6: config("t6", {
    accent: "#2f5bff",
    accent2: "#0e1726",
    ink: "#121620",
    muted: "#5b6474",
    bg: "#f3f1ec",
    surface: "#ffffff",
  }),
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
