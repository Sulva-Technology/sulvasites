import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRewritePrompt, diffText, isRewriteAction, mergeRewrite, sanitizeHtml } from "../src/lib/ai/rewrite.ts";

const hero = { type: "hero", headline: "Old", subtext: "Sub", ctaText: "Go", ctaHref: "#contact" };

test("takes new text but restores locked fields", () => {
  const out = mergeRewrite(hero, { type: "faq", headline: "New", subtext: "S2", ctaText: "Start", ctaHref: "https://evil.test" });
  assert.deepEqual(out, { type: "hero", headline: "New", subtext: "S2", ctaText: "Start", ctaHref: "#contact" });
});

test("keeps original where model output is missing, empty or wrong type", () => {
  const out = mergeRewrite(hero, { headline: "", subtext: 5 });
  assert.deepEqual(out, hero);
  assert.deepEqual(mergeRewrite(hero, "garbage"), hero);
});

test("item count and order come from the original", () => {
  const faq = { type: "faq", title: "T", items: [{ question: "q1", answer: "a1" }, { question: "q2", answer: "a2" }] };
  const out = mergeRewrite(faq, { title: "T2", items: [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }, { question: "extra", answer: "x" }] });
  assert.equal(out.items.length, 2);
  assert.equal(out.items[1].question, "Q2");
  const short = mergeRewrite(faq, { title: "T2", items: [{ question: "Q1", answer: "A1" }] });
  assert.equal(short.items[1].question, "q2");
});

test("image and link fields are never taken from the model", () => {
  const team = { type: "team", title: "T", subtitle: "S", members: [{ name: "A", role: "R", bio: "B", photoUrl: "/a.jpg", linkedinUrl: "https://l.in/a" }] };
  const out = mergeRewrite(team, { title: "T", subtitle: "S", members: [{ name: "A", role: "R", bio: "B2", photoUrl: "http://x", linkedinUrl: "http://y" }] });
  assert.equal(out.members[0].bio, "B2");
  assert.equal(out.members[0].photoUrl, "/a.jpg");
  assert.equal(out.members[0].linkedinUrl, "https://l.in/a");
  const gal = { type: "gallery", title: "G", images: [{ url: "/g.jpg", alt: "old" }] };
  const g = mergeRewrite(gal, { title: "G", images: [{ url: "http://z", alt: "new alt" }] });
  assert.deepEqual(g.images[0], { url: "/g.jpg", alt: "new alt" });
});

test("richtext body is sanitised", () => {
  const rt = { type: "richtext", title: "T", body: "<p>x</p>" };
  const out = mergeRewrite(rt, { title: "T", body: '<p onclick="a()">hi</p><script>alert(1)</script><a href="javascript:evil()">l</a>' });
  assert.equal(out.body.includes("script"), false);
  assert.equal(out.body.includes("onclick"), false);
  assert.equal(out.body.includes("javascript:"), false);
  assert.match(out.body, /<p>hi<\/p>/);
  assert.equal(sanitizeHtml("<ul><li>ok</li></ul>"), "<ul><li>ok</li></ul>");
});

test("diffText lists only changed strings with readable paths", () => {
  const after = mergeRewrite(hero, { headline: "New", subtext: "Sub", ctaText: "Go" });
  assert.deepEqual(diffText(hero, after), [{ path: "headline", before: "Old", after: "New" }]);
  const faq = { items: [{ question: "a" }, { question: "b" }] };
  assert.deepEqual(diffText(faq, { items: [{ question: "a" }, { question: "c" }] }), [
    { path: "items[2].question", before: "b", after: "c" },
  ]);
});

test("prompt includes action, option and context", () => {
  const p = buildRewritePrompt({ section: hero, action: "translate", option: "French", context: "Acme Bakery" });
  assert.match(p.user, /Translate/);
  assert.match(p.user, /Language: French/);
  assert.match(p.user, /Acme Bakery/);
  assert.match(p.user, /"headline":"Old"/);
  const t = buildRewritePrompt({ section: hero, action: "tone", option: "bold" });
  assert.match(t.user, /Tone: bold/);
  assert.equal(buildRewritePrompt({ section: hero, action: "shorten", option: "ignored" }).user.includes("ignored"), false);
});

test("isRewriteAction", () => {
  assert.equal(isRewriteAction("shorten"), true);
  assert.equal(isRewriteAction("delete"), false);
});
