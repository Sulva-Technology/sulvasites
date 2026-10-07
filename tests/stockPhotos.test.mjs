import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STOCK_PHOTOS, categoryForTemplate, fillSiteImages, normalizeCategory, photoUrl, pickPhotos,
  stripAiImageUrls,
} from "../src/lib/stockPhotos.ts";

const page = (sections) => ({ seo: { title: "", description: "" }, sections });

test("photoUrl builds hotlink", () => {
  assert.equal(photoUrl("photo-1-a", 800), "https://images.unsplash.com/photo-1-a?auto=format&fit=crop&w=800&q=75");
});

test("normalizeCategory falls back to general", () => {
  assert.equal(normalizeCategory("clinic"), "clinic");
  assert.equal(normalizeCategory(" Clinic "), "clinic");
  assert.equal(normalizeCategory("spaceships"), "general");
  assert.equal(normalizeCategory(undefined), "general");
});

test("categoryForTemplate maps templates", () => {
  assert.equal(categoryForTemplate("t5"), "beauty");
  assert.equal(categoryForTemplate("t6"), "real_estate");
  assert.equal(categoryForTemplate("t7"), "food");
  assert.equal(categoryForTemplate("t8"), "clinic");
  assert.equal(categoryForTemplate("t9"), "fitness");
  assert.equal(categoryForTemplate("t10"), "education");
  assert.equal(categoryForTemplate("t11"), "events");
  assert.equal(categoryForTemplate("t12"), "construction");
  assert.equal(categoryForTemplate("t13"), "fashion");
  assert.equal(categoryForTemplate("t14"), "retail");
  assert.equal(categoryForTemplate("t15"), "automotive");
  assert.equal(categoryForTemplate("t16"), "community");
  assert.equal(categoryForTemplate("zzz"), "general");
});

test("pickPhotos is deterministic, unique, sized", () => {
  const a = pickPhotos("clinic", 8, "Acme");
  assert.deepEqual(a, pickPhotos("clinic", 8, "Acme"));
  assert.equal(a.length, 8);
  assert.equal(new Set(a.map((p) => p.id)).size, 8);
  assert.notDeepEqual(a.map((p) => p.id), pickPhotos("clinic", 8, "Other").map((p) => p.id));
  const clinicIds = new Set(STOCK_PHOTOS.clinic.map((p) => p.id));
  assert.ok(clinicIds.has(a[0].id), "category photos come first");
});

test("pickPhotos tops up past category size", () => {
  const n = STOCK_PHOTOS.clinic.length + 3;
  const r = pickPhotos("clinic", n, "x");
  assert.equal(r.length, n);
  assert.equal(new Set(r.map((p) => p.id)).size, n);
});

test("fillSiteImages fills empty gallery to 6 and team photos", () => {
  const pages = {
    home: page([{ type: "hero", headline: "", subtext: "", ctaText: "", ctaHref: "" },
                { type: "gallery", title: "G", images: [{ url: "", alt: "" }] }]),
    about: page([{ type: "team", title: "", subtitle: "", members: [{ name: "A", role: "", bio: "", photoUrl: "" }] }]),
  };
  const before = JSON.stringify(pages);
  const out = fillSiteImages(pages, "clinic", "Acme");
  assert.equal(JSON.stringify(pages), before, "input not mutated");
  const g = out.home.sections[1];
  assert.equal(g.images.length, 6);
  assert.ok(g.images.every((i) => i.url.startsWith("https://images.unsplash.com/") && i.alt));
  assert.ok(out.about.sections[0].members[0].photoUrl.startsWith("https://images.unsplash.com/"));
  assert.deepEqual(out, fillSiteImages(pages, "clinic", "Acme"));
});

test("fillSiteImages keeps existing urls and only fills blanks", () => {
  const pages = { home: page([{ type: "gallery", title: "G", images: [{ url: "https://x/1.jpg", alt: "mine" }, { url: "", alt: "" }] }]) };
  const g = fillSiteImages(pages, "food", "s").home.sections[0];
  assert.equal(g.images.length, 2);
  assert.deepEqual(g.images[0], { url: "https://x/1.jpg", alt: "mine" });
  assert.ok(g.images[1].url.startsWith("https://images.unsplash.com/"));
});

test("fillSiteImages adds a home gallery before faq/contact when missing", () => {
  const pages = { home: page([
    { type: "hero", headline: "", subtext: "", ctaText: "", ctaHref: "" },
    { type: "faq", title: "", items: [] },
    { type: "contact_card", showForm: true, mapLink: "" },
  ]) };
  const s = fillSiteImages(pages, "tech", "s").home.sections;
  assert.deepEqual(s.map((x) => x.type), ["hero", "gallery", "faq", "contact_card"]);
  assert.equal(s[1].images.length, 6);
});

test("no photo repeats across the whole site", () => {
  const pages = {
    home: page([{ type: "gallery", title: "", images: [] }]),
    about: page([{ type: "gallery", title: "", images: [] }]),
  };
  const out = fillSiteImages(pages, "beauty", "s");
  const urls = [...out.home.sections[0].images, ...out.about.sections[0].images].map((i) => i.url);
  assert.equal(new Set(urls).size, urls.length);
});

test("fillSiteImages tolerates non-string url/photoUrl instead of throwing", () => {
  const pages = {
    home: page([{ type: "gallery", title: "G", images: [{ url: 123, alt: "" }] }]),
    about: page([{ type: "team", title: "", subtitle: "", members: [{ name: "A", role: "", bio: "", photoUrl: 456 }] }]),
  };
  const out = fillSiteImages(pages, "clinic", "Acme");
  assert.ok(out.home.sections[0].images[0].url.startsWith("https://images.unsplash.com/"));
  assert.ok(out.about.sections[0].members[0].photoUrl.startsWith("https://images.unsplash.com/"));
});

test("stripAiImageUrls clears gallery image urls and team photoUrls, keeps other fields", () => {
  const pages = {
    home: page([{ type: "gallery", title: "G", images: [{ url: "https://example.com/x.jpg", alt: "keep me" }] }]),
    about: page([{ type: "team", title: "", subtitle: "", members: [{ name: "A", role: "R", bio: "B", photoUrl: "https://example.com/p.jpg" }] }]),
  };
  const before = JSON.stringify(pages);
  const out = stripAiImageUrls(pages);
  assert.equal(JSON.stringify(pages), before, "input not mutated");
  assert.equal(out.home.sections[0].images[0].url, "");
  assert.equal(out.home.sections[0].images[0].alt, "keep me");
  assert.equal(out.about.sections[0].members[0].photoUrl, "");
  assert.equal(out.about.sections[0].members[0].name, "A");
});

test("stripAiImageUrls tolerates undefined images and members arrays", () => {
  const pages = {
    home: page([{ type: "gallery", title: "G" }]),
    about: page([{ type: "team", title: "", subtitle: "" }]),
  };
  const out = stripAiImageUrls(pages);
  assert.deepEqual(out.home.sections[0], { type: "gallery", title: "G" });
  assert.deepEqual(out.about.sections[0], { type: "team", title: "", subtitle: "" });
});

test("stripAiImageUrls then fillSiteImages yields only unsplash urls, even over invented AI urls", () => {
  const pages = {
    home: page([{ type: "gallery", title: "G", images: [{ url: "https://example.com/x.jpg", alt: "a" }] }]),
    about: page([{ type: "team", title: "", subtitle: "", members: [{ name: "A", role: "", bio: "", photoUrl: "https://example.com/p.jpg" }] }]),
  };
  const out = fillSiteImages(stripAiImageUrls(pages), "clinic", "Acme");
  const galleryUrls = out.home.sections[0].images.map((i) => i.url);
  const teamUrls = out.about.sections[0].members.map((m) => m.photoUrl);
  for (const u of [...galleryUrls, ...teamUrls]) {
    assert.ok(u.startsWith("https://images.unsplash.com/"), u);
  }
});

test("fillSiteImages handles undefined images and members arrays", () => {
  const pages = {
    home: page([{ type: "gallery", title: "G" }]),
    about: page([{ type: "team", title: "", subtitle: "" }]),
  };
  const out = fillSiteImages(pages, "clinic", "Acme");
  assert.equal(out.home.sections[0].images.length, 6);
  assert.ok(out.home.sections[0].images.every((i) => i.url && i.alt));
  assert.equal(out.about.sections[0].members.length, 0);
});
