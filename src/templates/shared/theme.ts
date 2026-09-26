import type { CSSProperties } from "react";

/** Parses #rgb, #rrggbb, rgb(), rgba() into [r, g, b, a]. */
function parseColor(input: string): [number, number, number, number] | null {
  const s = input.trim().toLowerCase();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] == null ? 1 : Number(rgb[4])];
  return null;
}

function luminance([r, g, b]: [number, number, number, number]) {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Drops saved text/background overrides that would be unreadable (contrast < 3:1),
 * keeping accent colours. Protects sites whose colours were saved for an older
 * version of a redesigned template (e.g. white text for a former dark theme).
 */
export function sanitizeThemeStyle(style: CSSProperties | undefined, prefix: string): CSSProperties | undefined {
  if (!style) return style;
  const vars = style as Record<string, string>;
  const ink = vars[`--${prefix}-ink`];
  const bg = vars[`--${prefix}-bg`];
  if (!ink && !bg) return style;

  const inkC = parseColor(ink ?? "");
  const bgC = parseColor(bg ?? "");
  // If only one side is overridden, compare against the template default side via a
  // conservative assumption: light default bg / dark default ink.
  const L1 = inkC ? luminance(inkC) : 0.01;
  const L2 = bgC ? luminance(bgC) : 0.88;
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  const inkIsTranslucent = inkC ? inkC[3] < 1 : false;
  if (ratio >= 3 && !(inkIsTranslucent && L1 > L2)) return style;

  const out = { ...vars };
  for (const k of ["ink", "muted", "bg", "surface"]) delete out[`--${prefix}-${k}`];
  return out as CSSProperties;
}
