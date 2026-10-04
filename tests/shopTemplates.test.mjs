import { test } from "node:test";
import assert from "node:assert/strict";

import { TEMPLATE_META, templateSupportsShop } from "../src/templates/meta.ts";
import { TEMPLATE_THEME_CONFIGS } from "../src/lib/templateTheme.ts";
import { getPagePresets } from "../src/templates/pagePresets.ts";

test("t13 Mode is registered as a shop template", () => {
  assert.equal(templateSupportsShop("t13"), true);
  assert.equal(templateSupportsShop("t12"), false);
  const meta = TEMPLATE_META.find((t) => t.key === "t13");
  assert.equal(meta?.name, "Mode");
  assert.equal(meta?.shop, true);
  assert.ok(TEMPLATE_THEME_CONFIGS.t13);
  assert.equal(TEMPLATE_THEME_CONFIGS.t13.defaults.accent, "#b4532a");
});

test("t13 presets: shop, lookbook, size-guide", () => {
  assert.deepEqual(getPagePresets("t13").map((p) => p.key), ["shop", "lookbook", "size-guide"]);
});
