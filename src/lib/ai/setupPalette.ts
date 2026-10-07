// Brand colour helpers for the assistant setup step. Pure; relative imports only (Node test runner).
import { TEMPLATE_THEME_CONFIGS } from "../templateTheme.ts";

export type ColorChoice = { accent: string; accent2: string; source: "logo" | "preset" | "words" | "custom" };
export type PalettePreset = { id: string; name: string; accent: string; accent2: string };

const WORDS: Record<string, string> = {
  red: "#d62828", maroon: "#7a1f2b", burgundy: "#7a1f3d", pink: "#e75480", orange: "#f77f00", coral: "#ff6f59",
  yellow: "#f4c430", gold: "#c9a227", green: "#2a9d8f", emerald: "#0f9d58", olive: "#6b7d2a", teal: "#0f8b8d",
  blue: "#1b6fe0", navy: "#14213d", sky: "#4fb6ff", purple: "#6a4c93", lilac: "#b497d6", brown: "#7f5539",
  beige: "#d6c4a8", black: "#111111", grey: "#6b7280", gray: "#6b7280", white: "#ffffff",
};
const HEX_RE = /^#[0-9a-f]{6}$/i;

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

/** WCAG contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

const sat = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

const darken = (hex: string, f: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0")).join("");

/** "navy and gold" -> most saturated named colour as accent, a dark one as accent2. */
export function colorWordsToChoice(text: string): ColorChoice | null {
  const found = (String(text ?? "").toLowerCase().match(/[a-z]+/g) ?? []).map((w) => WORDS[w]).filter((h): h is string => !!h);
  if (!found.length) return null;
  const sorted = [...new Set(found)].sort((a, b) => lum(a) - lum(b)); // darkest first
  const accent = [...sorted].sort((a, b) => sat(b) - sat(a))[0]!;
  const accent2 = sorted.find((h) => h !== accent && lum(h) < 0.2) ?? "#111111";
  return { accent, accent2, source: "words" };
}

const p = (cat: string, name: string, accent: string, accent2: string): PalettePreset => ({
  id: `${cat}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  accent,
  accent2,
});

/** Six presets per photo category; the first is the category's signature look. */
const PRESETS: Record<string, PalettePreset[]> = {
  corporate: [
    p("corporate", "Teal trust", "#0ea58c", "#0b1220"),
    p("corporate", "Navy", "#1b4f9c", "#0e1a2b"),
    p("corporate", "Slate", "#475569", "#0f172a"),
    p("corporate", "Emerald", "#0f9d58", "#10231a"),
    p("corporate", "Royal", "#4338ca", "#1e1b4b"),
    p("corporate", "Burgundy", "#9e1b3c", "#1a0d12"),
  ],
  clinic: [
    p("clinic", "Mint", "#0f8a7e", "#0d2b33"),
    p("clinic", "Sky", "#1b8ad3", "#0c2233"),
    p("clinic", "Calm blue", "#2563eb", "#0f1e3d"),
    p("clinic", "Sage", "#5a8f69", "#1a2b20"),
    p("clinic", "Lavender", "#7c6bc4", "#1f1a33"),
    p("clinic", "Coral", "#e76f51", "#2a1712"),
  ],
  beauty: [
    p("beauty", "Rose", "#d0567b", "#221a1f"),
    p("beauty", "Blush", "#e08aa0", "#2b1a20"),
    p("beauty", "Plum", "#8e3b8a", "#1f0f1f"),
    p("beauty", "Gold", "#c9a227", "#1a1612"),
    p("beauty", "Nude", "#b07d62", "#2a1d17"),
    p("beauty", "Berry", "#a3214f", "#1a0d14"),
  ],
  real_estate: [
    p("real_estate", "Forest", "#3e6b48", "#161615"),
    p("real_estate", "Navy", "#1f3a5f", "#0e1724"),
    p("real_estate", "Bronze", "#a8743a", "#1d1712"),
    p("real_estate", "Slate", "#4a5d6e", "#141a20"),
    p("real_estate", "Terracotta", "#c0553a", "#221410"),
    p("real_estate", "Olive", "#6b7d2a", "#1a1f10"),
  ],
  food: [
    p("food", "Paprika", "#d1495b", "#2b2118"),
    p("food", "Olive", "#6b7d2a", "#1f2416"),
    p("food", "Saffron", "#f4a259", "#2a1b0e"),
    p("food", "Berry", "#8e2c48", "#1a0f14"),
    p("food", "Mint", "#2a9d8f", "#0f1f1d"),
    p("food", "Charcoal", "#e76f51", "#111111"),
  ],
  tech: [
    p("tech", "Violet", "#6c5cff", "#0c0e1a"),
    p("tech", "Electric", "#1f6feb", "#0b1220"),
    p("tech", "Cyan", "#0891b2", "#0a1a22"),
    p("tech", "Lime", "#65a30d", "#111827"),
    p("tech", "Magenta", "#c026d3", "#160b1f"),
    p("tech", "Orange", "#f97316", "#111111"),
  ],
  creative: [
    p("creative", "Cobalt", "#3d6bff", "#14151a"),
    p("creative", "Tomato", "#e4572e", "#17141a"),
    p("creative", "Mustard", "#d4a017", "#1a1712"),
    p("creative", "Teal", "#0f8b8d", "#101a1b"),
    p("creative", "Pink", "#e75480", "#1a1216"),
    p("creative", "Ink", "#2b2b2b", "#111111"),
  ],
  fashion: [
    p("fashion", "Rust", "#b4532a", "#121212"),
    p("fashion", "Noir", "#1a1a1a", "#0a0a0a"),
    p("fashion", "Camel", "#b5835a", "#1c1612"),
    p("fashion", "Wine", "#7a1f3d", "#140c10"),
    p("fashion", "Sage", "#7d8f69", "#1a1f17"),
    p("fashion", "Blush", "#d98c8c", "#1f1416"),
  ],
  fitness: [
    p("fitness", "Red", "#e5322d", "#0b0b0c"),
    p("fitness", "Volt", "#84cc16", "#0b0b0c"),
    p("fitness", "Orange", "#f26b1d", "#111112"),
    p("fitness", "Blue", "#2563eb", "#0b1020"),
    p("fitness", "Magenta", "#db2777", "#120a10"),
    p("fitness", "Teal", "#0d9488", "#0a1514"),
  ],
  education: [
    p("education", "Royal", "#2747d6", "#121a3a"),
    p("education", "Green", "#15803d", "#0f1f17"),
    p("education", "Maroon", "#7a1f2b", "#1a0e10"),
    p("education", "Orange", "#ea7317", "#1a1410"),
    p("education", "Teal", "#0f766e", "#0d1f1d"),
    p("education", "Purple", "#6a4c93", "#1a1226"),
  ],
  construction: [
    p("construction", "Safety orange", "#f26b1d", "#1d2124"),
    p("construction", "Yellow", "#e0a800", "#1b1e21"),
    p("construction", "Steel", "#3b6ea5", "#141a20"),
    p("construction", "Brick", "#b23a2a", "#1d1614"),
    p("construction", "Green", "#2f7d32", "#141c14"),
    p("construction", "Charcoal", "#4b5563", "#111111"),
  ],
  retail: [
    p("retail", "Blue", "#1f6feb", "#0e1726"),
    p("retail", "Coral", "#ff6f59", "#1a1414"),
    p("retail", "Green", "#16a34a", "#0f1a14"),
    p("retail", "Purple", "#7c3aed", "#150f24"),
    p("retail", "Gold", "#c9a227", "#16130c"),
    p("retail", "Red", "#d62828", "#140c0c"),
  ],
  events: [
    p("events", "Violet", "#7b2ff7", "#1b0f2e"),
    p("events", "Gold", "#c9a227", "#1a1410"),
    p("events", "Rose", "#e75480", "#24101a"),
    p("events", "Emerald", "#0f9d58", "#0c1f16"),
    p("events", "Midnight", "#2c3e8c", "#0a0f1c"),
    p("events", "Coral", "#ff6f59", "#1f1210"),
  ],
  logistics: [
    p("logistics", "Blue", "#1b6fe0", "#0b1830"),
    p("logistics", "Orange", "#f77f00", "#14181f"),
    p("logistics", "Green", "#2a9d8f", "#0f1f1d"),
    p("logistics", "Red", "#d62828", "#121417"),
    p("logistics", "Yellow", "#f4c430", "#1a1a1a"),
    p("logistics", "Navy", "#1f3a5f", "#0a0f1c"),
  ],
  automotive: [
    p("automotive", "Racing red", "#c8102e", "#050505"),
    p("automotive", "Gold", "#c9a227", "#0c0b08"),
    p("automotive", "British green", "#1f5c3a", "#07110b"),
    p("automotive", "Gulf blue", "#2f7fc1", "#071420"),
    p("automotive", "Orange", "#f77f00", "#120c06"),
    p("automotive", "Silver", "#6b7280", "#0a0a0b"),
  ],
  general: [
    p("general", "Teal", "#0ea58c", "#0b1220"),
    p("general", "Blue", "#1b6fe0", "#0e1726"),
    p("general", "Coral", "#e76f51", "#1f1410"),
    p("general", "Purple", "#6a4c93", "#170f24"),
    p("general", "Green", "#2f7d32", "#111a12"),
    p("general", "Gold", "#c9a227", "#16130c"),
  ],
};

export function presetsFor(category: string): PalettePreset[] {
  return PRESETS[category] ?? PRESETS.general!;
}

/** Logo palette -> most saturated colour as accent, darkest (if dark enough) as accent2. */
export function choiceFromLogo(palette: string[]): ColorChoice | null {
  const hex = (Array.isArray(palette) ? palette : []).filter((h) => typeof h === "string" && HEX_RE.test(h)).map((h) => h.toLowerCase());
  if (!hex.length) return null;
  const accent = [...hex].sort((a, b) => sat(b) - sat(a))[0]!;
  const dark = [...hex].sort((a, b) => lum(a) - lum(b)).find((h) => h !== accent && lum(h) < 0.2);
  return { accent, accent2: dark ?? "#111111", source: "logo" };
}

/**
 * Owner choice -> full six-key palette for one template. bg/ink/muted/surface stay at the
 * template defaults (keeps dark-mode overrides working); accent is darkened until it
 * reaches 3:1 against the template background.
 */
export function expandPalette(templateKey: string, choice: ColorChoice): Record<string, string> {
  const d = TEMPLATE_THEME_CONFIGS[templateKey]?.defaults ?? TEMPLATE_THEME_CONFIGS.t1!.defaults;
  let accent = HEX_RE.test(choice.accent) ? choice.accent.toLowerCase() : d.accent!;
  for (let i = 0; i < 12 && contrastRatio(accent, d.bg!) < 3; i++) accent = darken(accent, 0.85);
  const accent2 = HEX_RE.test(choice.accent2) ? choice.accent2.toLowerCase() : d.accent2!;
  return { ...d, accent, accent2 };
}
