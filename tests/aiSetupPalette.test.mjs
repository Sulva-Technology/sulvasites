import { test } from "node:test";
import assert from "node:assert/strict";

import { colorWordsToChoice, presetsFor, choiceFromLogo, expandPalette, contrastRatio } from "../src/lib/ai/setupPalette.ts";
import { TEMPLATE_THEME_CONFIGS } from "../src/lib/templateTheme.ts";
import { PHOTO_CATEGORIES } from "../src/lib/stockPhotoData.ts";

test("colour words map to accent + dark", () => {
  const c = colorWordsToChoice("we like navy and gold");
  assert.equal(c.source, "words");
  assert.equal(c.accent, "#c9a227");
  assert.equal(c.accent2, "#14213d");
  assert.equal(colorWordsToChoice("no preference"), null);
  assert.equal(colorWordsToChoice(""), null);
});

test("six presets per category, valid hex", () => {
  for (const cat of ["food", "clinic", "beauty", "general"]) {
    const p = presetsFor(cat);
    assert.equal(p.length, 6);
    for (const x of p) assert.match(x.accent, /^#[0-9a-f]{6}$/);
  }
});

test("every photo category has its own 6 presets with lowercase hex and unique ids", () => {
  const ids = new Set();
  for (const cat of PHOTO_CATEGORIES) {
    const p = presetsFor(cat);
    assert.equal(p.length, 6, cat);
    for (const x of p) {
      assert.match(x.accent, /^#[0-9a-f]{6}$/, `${cat} ${x.id}`);
      assert.match(x.accent2, /^#[0-9a-f]{6}$/, `${cat} ${x.id}`);
      assert.ok(x.name, `${cat} ${x.id} name`);
      assert.ok(!ids.has(x.id), `duplicate id ${x.id}`);
      ids.add(x.id);
    }
  }
  assert.deepEqual(presetsFor("nonsense"), presetsFor("general"));
});

test("logo palette: saturated -> accent, darkest -> accent2", () => {
  const c = choiceFromLogo(["#f2f2f2", "#e63946", "#1d3557"]);
  assert.deepEqual([c.accent, c.accent2], ["#e63946", "#1d3557"]);
  assert.equal(c.source, "logo");
  assert.equal(choiceFromLogo([]), null);
  // extractLogoColors returns uppercase hex
  assert.equal(choiceFromLogo(["#E63946"]).accent, "#e63946");
});

test("expand keeps template bg/ink and enforces 3:1 accent contrast", () => {
  const pal = expandPalette("t1", { accent: "#fff7a8", accent2: "#111111", source: "custom" });
  const d = TEMPLATE_THEME_CONFIGS.t1.defaults;
  assert.equal(pal.bg, d.bg);
  assert.equal(pal.ink, d.ink);
  assert.ok(contrastRatio(pal.accent, pal.bg) >= 3);
  assert.deepEqual(Object.keys(pal).sort(), ["accent", "accent2", "bg", "ink", "muted", "surface"]);
});

test("expand works for every template and falls back on bad hex", () => {
  for (const key of Object.keys(TEMPLATE_THEME_CONFIGS)) {
    const pal = expandPalette(key, { accent: "#c9a227", accent2: "#14213d", source: "words" });
    assert.ok(contrastRatio(pal.accent, pal.bg) >= 3, key);
    assert.equal(pal.accent2, "#14213d");
  }
  const bad = expandPalette("t7", { accent: "nope", accent2: "red", source: "custom" });
  assert.equal(bad.accent, TEMPLATE_THEME_CONFIGS.t7.defaults.accent);
  assert.equal(bad.accent2, TEMPLATE_THEME_CONFIGS.t7.defaults.accent2);
  assert.ok(Math.abs(contrastRatio("#ffffff", "#000000") - 21) < 0.01);
});
