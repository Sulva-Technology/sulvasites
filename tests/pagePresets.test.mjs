import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPresetPageData,
  getPagePresets,
  labelForPageKey,
  sortPageKeys,
} from "../src/templates/pagePresets.ts";
import { validatePageData } from "../src/lib/pageSchema.ts";

const RESERVED = ["home", "about", "contact", "p"];

test("every template has presets that build valid pages with safe keys", () => {
  for (const t of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
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
