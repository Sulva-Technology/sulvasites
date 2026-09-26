export type TemplateKeyWithTheme = "t1" | "t3" | "t4" | "t5" | "t6";

export type ThemeSemanticColors = Record<string, string>;

export type TemplateThemeConfig = {
  defaults: ThemeSemanticColors;
  variables: Record<string, string>;
  labels: Record<string, string>;
};

export const TEMPLATE_THEME_CONFIGS: Record<TemplateKeyWithTheme, TemplateThemeConfig> = {
  t1: {
    defaults: {
      primary: "#6B46C1",
      accent: "#8B5CF6",
      dark: "#4C1D95",
      textPrimary: "#1F2937",
      textSecondary: "#6B7280",
      bgMain: "#FFFFFF",
      bgLight: "#F9FAFB",
    },
    variables: {
      primary: "--color-primary",
      accent: "--color-accent",
      dark: "--color-dark",
      textPrimary: "--color-text-primary",
      textSecondary: "--color-text-secondary",
      bgMain: "--color-bg-main",
      bgLight: "--color-bg-light",
    },
    labels: {
      primary: "Primary Color",
      accent: "Accent Color",
      dark: "Dark Accent",
      textPrimary: "Primary Text",
      textSecondary: "Secondary Text",
      bgMain: "Main Background",
      bgLight: "Light Background",
    },
  },
  t3: {
    defaults: {
      accent: "#b4532a",
      accent2: "#1f3a34",
      ink: "#1b1a17",
      muted: "#6e685f",
      bg: "#f4efe7",
      surface: "#fffdf9",
    },
    variables: {
      accent: "--t3-accent",
      accent2: "--t3-accent2",
      ink: "--t3-ink",
      muted: "--t3-muted",
      bg: "--t3-bg",
      surface: "--t3-surface",
    },
    labels: {
      accent: "Accent",
      accent2: "Band / Cover Color",
      ink: "Text Color",
      muted: "Muted Text",
      bg: "Paper Background",
      surface: "Surface",
    },
  },
  t4: {
    defaults: {
      accent: "#7c3aed",
      accent2: "#06b6d4",
      ink: "rgba(255, 255, 255, 0.92)",
      muted: "rgba(255, 255, 255, 0.66)",
      bg: "#0b0f19",
      surface: "rgba(255, 255, 255, 0.06)",
    },
    variables: {
      accent: "--t4-accent",
      accent2: "--t4-accent2",
      ink: "--t4-ink",
      muted: "--t4-muted",
      bg: "--t4-bg",
      surface: "--t4-surface",
    },
    labels: {
      accent: "Primary Accent",
      accent2: "Secondary Accent",
      ink: "Text Color",
      muted: "Muted Text",
      bg: "Background",
      surface: "Surface",
    },
  },
  t5: {
    defaults: {
      accent: "#2563eb",
      accent2: "#db2777",
      ink: "#0b1220",
      muted: "rgba(11, 18, 32, 0.62)",
      bg: "#f7f8fb",
      surface: "#ffffff",
    },
    variables: {
      accent: "--t5-accent",
      accent2: "--t5-accent2",
      ink: "--t5-ink",
      muted: "--t5-muted",
      bg: "--t5-bg",
      surface: "--t5-surface",
    },
    labels: {
      accent: "Primary Accent",
      accent2: "Secondary Accent",
      ink: "Text Color",
      muted: "Muted Text",
      bg: "Background",
      surface: "Surface",
    },
  },
  t6: {
    defaults: {
      accent: "#2f5bff",
      accent2: "#0e1726",
      ink: "#121620",
      muted: "#5b6474",
      bg: "#f3f1ec",
      surface: "#ffffff",
    },
    variables: {
      accent: "--t6-accent",
      accent2: "--t6-accent2",
      ink: "--t6-ink",
      muted: "--t6-muted",
      bg: "--t6-bg",
      surface: "--t6-surface",
    },
    labels: {
      accent: "Accent (buttons, links)",
      accent2: "Dark Sections & Footer",
      ink: "Text Color",
      muted: "Muted Text",
      bg: "Page Background",
      surface: "Cards",
    },
  },
};

export function getTemplateThemeConfig(templateKey: string): TemplateThemeConfig | null {
  const k = templateKey as TemplateKeyWithTheme;
  return TEMPLATE_THEME_CONFIGS[k] ?? null;
}

export function toCssVarMap(templateKey: string, colors: ThemeSemanticColors): Record<string, string> {
  const config = getTemplateThemeConfig(templateKey);
  if (!config) return {};

  const cssVars: Record<string, string> = {};
  for (const [semanticKey, value] of Object.entries(colors)) {
    const cssVar = config.variables[semanticKey];
    if (cssVar && typeof value === "string") {
      cssVars[cssVar] = value;
    }
  }
  return cssVars;
}

export function applyThemeColors(root: HTMLElement, templateKey: string, colors: ThemeSemanticColors) {
  const cssVars = toCssVarMap(templateKey, colors);
  for (const [k, v] of Object.entries(cssVars)) {
    root.style.setProperty(k, v);
  }
}

