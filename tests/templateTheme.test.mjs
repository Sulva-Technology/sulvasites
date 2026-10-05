import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TEMPLATE_THEME_CONFIGS, effectiveDarkColors, toCssVarMap } from "../src/lib/templateTheme.ts";

const KEYS = ["accent", "accent2", "ink", "muted", "bg", "surface"];

test("every template exposes the same six palette variables", () => {
  for (const t of Object.keys(TEMPLATE_THEME_CONFIGS)) {
    const cfg = TEMPLATE_THEME_CONFIGS[t];
    assert.ok(cfg, `${t} missing`);
    assert.deepEqual(Object.keys(cfg.variables).sort(), [...KEYS].sort());
    for (const k of KEYS) assert.equal(cfg.variables[k], `--${t}-${k}`);
  }
});

test("palette defaults match each template's CSS defaults", () => {
  for (const t of Object.keys(TEMPLATE_THEME_CONFIGS)) {
    const css = readFileSync(new URL(`../src/templates/template${t.slice(1)}/template${t.slice(1)}.css`, import.meta.url), "utf8");
    for (const k of KEYS) {
      const m = css.match(new RegExp(`--${t}-${k}:\\s*([^;]+);`));
      assert.ok(m, `${t}: --${t}-${k} not defined in CSS`);
      assert.equal(m[1].trim().toLowerCase(), TEMPLATE_THEME_CONFIGS[t].defaults[k].toLowerCase(), `${t}.${k}`);
    }
  }
});

test("toCssVarMap ignores unknown / legacy keys", () => {
  assert.deepEqual(toCssVarMap("t1", { primary: "#000", accent: "#111" }), { "--t1-accent": "#111" });
});

test("dark palette defaults match each template's dark-mode fallbacks", () => {
  for (const t of Object.keys(TEMPLATE_THEME_CONFIGS)) {
    const css = readFileSync(new URL(`../src/templates/template${t.slice(1)}/template${t.slice(1)}.css`, import.meta.url), "utf8");
    const dark = TEMPLATE_THEME_CONFIGS[t].dark;
    const hasDarkBlock = css.includes(`.template${t.slice(1)}[data-mode="dark"]`);
    assert.equal(!!dark, hasDarkBlock, `${t}: dark config vs CSS`);
    if (!dark) continue;
    for (const [k, v] of Object.entries(dark.defaults)) {
      const needle = `--${t}-${k}: var(--${t}-dark-${k}, ${v}) !important;`;
      assert.ok(css.toLowerCase().includes(needle), `${t}: missing ${needle}`);
    }
  }
});

test("dark_ keys map to --tN-dark-* vars", () => {
  assert.deepEqual(toCssVarMap("t10", { dark_bg: "#000000", dark_accent: "#ffffff" }), {
    "--t10-dark-bg": "#000000",
    "--t10-dark-accent": "#ffffff",
  });
  // t1 has no dark mode — dark keys ignored.
  assert.deepEqual(toCssVarMap("t1", { dark_bg: "#000000" }), {});
});

test("readable light accent carries into dark mode, unreadable one doesn't", () => {
  assert.equal(toCssVarMap("t10", { accent: "#ffcc00" })["--t10-dark-accent"], "#ffcc00");
  assert.equal(toCssVarMap("t10", { accent: "#101830" })["--t10-dark-accent"], undefined);
  assert.equal(effectiveDarkColors("t10", { accent: "#101830" }).accent, "#8ea3ff");
  // Explicit dark accent wins.
  assert.equal(toCssVarMap("t10", { accent: "#ffcc00", dark_accent: "#00ff00" })["--t10-dark-accent"], "#00ff00");
});
