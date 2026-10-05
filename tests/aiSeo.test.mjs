import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALT_MAX,
  DESCRIPTION_MAX,
  TITLE_MAX,
  applySeoChanges,
  buildSeoPrompt,
  fitLength,
  listSeoChanges,
  mergeSeoOutput,
  mergeSeoPage,
  summarizePage,
} from "../src/lib/ai/seo.ts";

const page = {
  seo: { title: "Old title", description: "Old description" },
  sections: [
    { type: "hero", headline: "Fresh bread daily", subtext: "Baked at dawn", ctaText: "Order", ctaHref: "#contact" },
    { type: "richtext", title: "Story", body: "<p>Family <b>bakery</b> since 1990</p>" },
    {
      type: "gallery",
      title: "Our shop",
      images: [
        { url: "/a.jpg", alt: "" },
        { url: "/b.jpg", alt: "old b" },
      ],
    },
  ],
};

test("summary has copy without HTML or urls, and lists gallery images", () => {
  const s = summarizePage(page);
  assert.match(s, /Fresh bread daily/);
  assert.match(s, /Family bakery since 1990/);
  assert.equal(s.includes("<p>"), false);
  assert.equal(s.includes("/a.jpg"), false);
  assert.match(s, /section 2, image 1/);
});

test("prompt includes profile, page key and limits", () => {
  const p = buildSeoPrompt([{ key: "home", data: page }], { business_name: "Acme Bakery" });
  assert.match(p.user, /Business: Acme Bakery/);
  assert.match(p.user, /Page "home"/);
  assert.match(p.system, new RegExp(String(TITLE_MAX)));
});

test("fitLength cuts on a word boundary", () => {
  assert.equal(fitLength("short", 10), "short");
  const out = fitLength("one two three four five six", 15);
  assert.ok(out.length <= 15);
  assert.equal(out, "one two three");
});

test("merge changes only seo and gallery alts, trims lengths", () => {
  const ai = {
    title: "T ".repeat(80),
    description: "D ".repeat(200),
    alts: [
      { section: 2, image: 0, alt: "Bakery counter with loaves" },
      { section: 0, image: 0, alt: "ignored: not a gallery" },
      { section: 2, image: 9, alt: "ignored: no such image" },
    ],
    sections: "ignored",
  };
  const out = mergeSeoPage(page, ai);
  assert.ok(out.seo.title.length <= TITLE_MAX);
  assert.ok(out.seo.description.length <= DESCRIPTION_MAX);
  assert.equal(out.sections[2].images[0].alt, "Bakery counter with loaves");
  assert.equal(out.sections[2].images[0].url, "/a.jpg");
  assert.equal(out.sections[2].images[1].alt, "old b");
  assert.deepEqual(out.sections[0], page.sections[0]);
  assert.deepEqual(out.sections[1], page.sections[1]);
});

test("bad or empty model output keeps the original", () => {
  assert.deepEqual(mergeSeoPage(page, null), page);
  assert.deepEqual(mergeSeoPage(page, { title: "  ", description: 5, alts: "x" }), page);
  const long = mergeSeoPage(page, { alts: [{ section: 2, image: 1, alt: "a".repeat(300) }] });
  assert.ok(long.sections[2].images[1].alt.length <= ALT_MAX);
});

test("mergeSeoOutput maps per page key and tolerates missing pages", () => {
  const out = mergeSeoOutput(
    [
      { key: "home", data: page },
      { key: "about", data: page },
    ],
    { pages: { home: { title: "Acme Bakery | Fresh bread daily", description: "Fresh bread." } } },
  );
  assert.equal(out.home.seo.title, "Acme Bakery | Fresh bread daily");
  assert.deepEqual(out.about, page);
});

test("listSeoChanges and applySeoChanges round-trip with selection", () => {
  const after = mergeSeoPage(page, {
    title: "New title",
    description: "New description",
    alts: [
      { section: 2, image: 0, alt: "Shop front" },
      { section: 2, image: 1, alt: "old b" },
    ],
  });
  const changes = listSeoChanges("home", page, after);
  assert.deepEqual(changes.map((c) => c.id), ["home:title", "home:description", "home:alt:2:0"]);

  const picked = applySeoChanges(page, changes.filter((c) => c.field !== "description"));
  assert.equal(picked.seo.title, "New title");
  assert.equal(picked.seo.description, "Old description");
  assert.equal(picked.sections[2].images[0].alt, "Shop front");
  assert.equal(picked.sections[2].images[1].alt, "old b");
  assert.deepEqual(applySeoChanges(page, []), page);
});
