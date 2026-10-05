import { test } from "node:test";
import assert from "node:assert/strict";

import { placeOwnerImages, replaceUploadTokens, isAllowedStockUrl, UPLOAD_TOKEN, uploadIndex } from "../src/lib/ai/setupPhotos.ts";

const seo = { title: "t", description: "d" };

test("owner images fill home gallery first", () => {
  const pages = { home: { seo, sections: [{ type: "gallery", title: "G", images: [{ url: "", alt: "" }, { url: "", alt: "" }] }] } };
  const out = placeOwnerImages(pages, [{ url: "upload:0", alt: "Shop front" }]);
  assert.equal(out.home.sections[0].images[0].url, "upload:0");
  assert.equal(out.home.sections[0].images[0].alt, "Shop front");
  assert.equal(out.home.sections[0].images[1].url, "");
  assert.equal(pages.home.sections[0].images[0].url, "", "input not mutated");
});

test("home gallery is created before faq/contact when missing; other pages next; never team", () => {
  const pages = {
    home: { seo, sections: [{ type: "hero", headline: "h" }, { type: "team", members: [{ name: "a", photoUrl: "" }] }, { type: "faq", items: [] }] },
    about: { seo, sections: [{ type: "gallery", title: "G", images: [{ url: "https://keep.example/a.jpg", alt: "k" }, { url: "", alt: "" }] }] },
  };
  const owner = Array.from({ length: 8 }, (_, i) => ({ url: `upload:${i}`, alt: `p${i}` }));
  const out = placeOwnerImages(pages, owner);
  const types = out.home.sections.map((s) => s.type);
  assert.deepEqual(types, ["hero", "team", "gallery", "faq"]);
  const g = out.home.sections[2];
  assert.deepEqual(g.images.slice(0, 6).map((i) => i.url), ["upload:0", "upload:1", "upload:2", "upload:3", "upload:4", "upload:5"]);
  assert.equal(out.about.sections[0].images[0].url, "https://keep.example/a.jpg");
  assert.equal(out.about.sections[0].images[1].url, "upload:6");
  // leftover goes back onto the home gallery so nothing the owner chose is lost
  assert.equal(g.images.at(-1).url, "upload:7");
  assert.equal(out.home.sections[1].members[0].photoUrl, "");
});

test("no owner images leaves pages untouched", () => {
  const pages = { home: { seo, sections: [{ type: "hero", headline: "h" }] } };
  assert.deepEqual(placeOwnerImages(pages, []), pages);
});

test("tokens replaced; failed upload falls back to stock", () => {
  const pages = { home: { seo, sections: [{ type: "gallery", title: "G", images: [{ url: "upload:0", alt: "a" }, { url: "upload:1", alt: "b" }] }] } };
  const out = replaceUploadTokens(pages, ["https://x.supabase.co/a.jpg", null], () => ({ url: "https://images.unsplash.com/photo-1?w=1600", alt: "stock" }));
  assert.deepEqual(out.home.sections[0].images.map((i) => i.url), ["https://x.supabase.co/a.jpg", "https://images.unsplash.com/photo-1?w=1600"]);
  assert.equal(out.home.sections[0].images[0].alt, "a");
  assert.equal(out.home.sections[0].images[1].alt, "stock");
});

test("out-of-range token also falls back", () => {
  const pages = { home: { seo, sections: [{ type: "gallery", title: "G", images: [{ url: "upload:5", alt: "a" }, { url: "https://k.example/x.jpg", alt: "k" }] }] } };
  const out = replaceUploadTokens(pages, [], (i) => ({ url: `https://images.unsplash.com/photo-${i}`, alt: "s" }));
  assert.equal(out.home.sections[0].images[0].url, "https://images.unsplash.com/photo-5");
  assert.equal(out.home.sections[0].images[1].url, "https://k.example/x.jpg");
});

test("only unsplash photo urls are allowed", () => {
  assert.ok(isAllowedStockUrl("https://images.unsplash.com/photo-123?w=1600"));
  assert.ok(!isAllowedStockUrl("https://evil.example/photo.jpg"));
  assert.ok(!isAllowedStockUrl("https://images.unsplash.com.evil.example/photo-1"));
  assert.ok(!isAllowedStockUrl("http://images.unsplash.com/photo-1"));
  assert.ok(!isAllowedStockUrl(42));
});

test("upload token helpers", () => {
  assert.equal(UPLOAD_TOKEN, "upload:");
  assert.equal(uploadIndex("upload:3"), 3);
  assert.equal(uploadIndex("upload:x"), -1);
  assert.equal(uploadIndex("https://a"), -1);
});
