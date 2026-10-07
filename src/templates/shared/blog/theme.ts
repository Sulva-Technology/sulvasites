import type { CSSProperties } from "react";

/** Each template's headline font variable, so blog titles match the rest of the site. */
const DISPLAY_FONT: Record<string, string> = {
  t1: "sans", t2: "serif", t3: "serif", t4: "display", t5: "serif", t6: "display", t7: "serif", t8: "font",
  t9: "display", t10: "font", t11: "display", t12: "font", t13: "serif", t14: "display", t15: "font", t16: "display",
  t17: "serif",
};

/**
 * Maps the template's own palette (`--tN-accent`, `--tN-ink`...) onto the blog's `--sb-*`
 * variables. They resolve inside the template root, so saved palettes and dark mode carry over.
 */
export function blogThemeVars(templateKey: string): CSSProperties {
  const k = /^t\d+$/.test(templateKey) ? templateKey : "t1";
  const font = DISPLAY_FONT[k];
  return {
    "--sb-accent": `var(--${k}-accent)`,
    "--sb-ink": `var(--${k}-ink)`,
    "--sb-muted": `var(--${k}-muted)`,
    "--sb-bg": `var(--${k}-bg)`,
    "--sb-surface": `var(--${k}-surface)`,
    "--sb-display": font ? `var(--${k}-${font}, inherit)` : "inherit",
  } as CSSProperties;
}
