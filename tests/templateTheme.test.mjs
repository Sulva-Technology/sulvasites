import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TEMPLATE_THEME_CONFIGS, toCssVarMap } from "../src/lib/templateTheme.ts";

const KEYS = ["accent", "accent2", "ink", "muted", "bg", "surface"];

test("every template exposes the same six palette variables", () => {
  for (const t of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
    const cfg = TEMPLATE_THEME_CONFIGS[t];
    assert.ok(cfg, `${t} missing`);
    assert.deepEqual(Object.keys(cfg.variables).sort(), [...KEYS].sort());
    for (const k of KEYS) assert.equal(cfg.variables[k], `--${t}-${k}`);
  }
});

test("palette defaults match each template's CSS defaults", () => {
  for (const t of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
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
