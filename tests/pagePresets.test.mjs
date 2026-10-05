import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PAGE_STARTERS,
  buildPresetPageData,
  describeSections,
  getPageIdeas,
  getPagePresets,
  labelForPageKey,
  sortPageKeys,
  uniquePageKey,
} from "../src/templates/pagePresets.ts";
import { validatePageData } from "../src/lib/pageSchema.ts";
import { TEMPLATE_THEME_CONFIGS } from "../src/lib/templateTheme.ts";

const RESERVED = ["home", "about", "contact", "p"];

test("every template has presets that build valid pages with safe keys", () => {
  for (const t of Object.keys(TEMPLATE_THEME_CONFIGS)) {
    const presets = getPagePresets(t);
    assert.ok(presets.length >= 2, `${t} should ship at least 2 extra pages`);
    const keys = new Set();
    for (const p of presets) {
      assert.ok(!RESERVED.includes(p.key), `${t}/${p.key} is reserved`);
      assert.match(p.key, /^[a-z0-9-]+$/);
      assert.ok(!keys.has(p.key), `${t}/${p.key} duplicated`);
      keys.add(p.key);
      const v = validatePageData(buildPresetPageData(p));
      assert.ok(v.ok, `${t}/${p.key}: ${v.error}`);
    }
  }
});

test("labels: preset label, else title-cased key", () => {
  assert.equal(labelForPageKey("t3", "work"), "Work");
  assert.equal(labelForPageKey("t3", "our-press_kit"), "Our Press Kit");
});

test("sort: presets first in preset order, then alphabetical", () => {
  assert.deepEqual(sortPageKeys("t3", ["pricing", "services", "about-me", "work"]), [
    "work",
    "services",
    "about-me",
    "pricing",
  ]);
});

test("starters build valid pages with safe, unique keys", () => {
  const keys = new Set();
  for (const p of PAGE_STARTERS) {
    assert.ok(!RESERVED.includes(p.key), `${p.key} is reserved`);
    assert.match(p.key, /^[a-z0-9-]+$/);
    assert.ok(!keys.has(p.key));
    keys.add(p.key);
    assert.ok(p.description, `${p.key} needs a description`);
    assert.ok(validatePageData(buildPresetPageData(p)).ok);
  }
});

test("uniquePageKey avoids existing and reserved keys", () => {
  assert.equal(uniquePageKey("pricing", []), "pricing");
  assert.equal(uniquePageKey("pricing", ["pricing", "pricing-2"]), "pricing-3");
  assert.equal(uniquePageKey("about", []), "about-2");
  assert.equal(uniquePageKey("", []), "page-2");
});

test("page ideas: recommendations first, no duplicates, skip pages the site has", () => {
  const ideas = getPageIdeas("t3", ["work"]);
  const keys = ideas.map((i) => i.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes("work"));
  assert.equal(ideas[0].key, "services");
  assert.equal(ideas[0].recommended, true);
  assert.ok(ideas.filter((i) => i.key === "services").length === 1);
  assert.ok(keys.includes("pricing"));
  // Blank page is always offered, under a free key.
  assert.ok(getPageIdeas("t3", ["page"]).some((i) => i.key === "page-2"));
});

test("describeSections uses plain names without repeats", () => {
  assert.equal(describeSections(["hero", "richtext", "richtext", "faq"]), "Banner · Text · FAQs");
});
