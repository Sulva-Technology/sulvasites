import { test } from "node:test";
import assert from "node:assert/strict";

import {
  allTags,
  blogPath,
  excerptOf,
  formatPostDate,
  paginate,
  parseBlogPath,
  postsForTag,
  readingMinutes,
  relatedPosts,
  slugifyTitle,
  tagLabel,
  tagSlug,
} from "../src/lib/blog/blogPath.ts";
import { safeUrl, sanitizePostHtml } from "../src/lib/blog/sanitize.ts";

const post = (id, tags, extra = {}) => ({
  id, slug: `p-${id}`, title: `Post ${id}`, excerpt: "", coverUrl: null, coverAlt: "", authorName: "",
  tags, featured: false, publishedAt: "2026-03-12T10:00:00Z", updatedAt: "2026-03-12T10:00:00Z",
  readMinutes: 1, seoTitle: "", seoDescription: "", ...extra,
});

test("parseBlogPath maps routes and rejects junk", () => {
  assert.deepEqual(parseBlogPath(undefined), { kind: "list", page: 1 });
  assert.deepEqual(parseBlogPath([]), { kind: "list", page: 1 });
  assert.deepEqual(parseBlogPath(["page", "2"]), { kind: "list", page: 2 });
  assert.deepEqual(parseBlogPath(["hello-world"]), { kind: "post", slug: "hello-world" });
  assert.deepEqual(parseBlogPath(["tag", "news"]), { kind: "tag", tag: "news", page: 1 });
  assert.deepEqual(parseBlogPath(["tag", "news", "page", "3"]), { kind: "tag", tag: "news", page: 3 });
  for (const bad of [["page", "1"], ["page", "0"], ["page", "x"], ["tag"], ["feed"], ["page"], ["Hello"], ["a", "b"], ["tag", "news", "page", "1"], ["%E0%A4%A"], ["a--b"]]) {
    assert.equal(parseBlogPath(bad), null, JSON.stringify(bad));
  }
});

test("blogPath round-trips every view", () => {
  for (const segs of [[], ["page", "4"], ["x-y"], ["tag", "t"], ["tag", "t", "page", "2"]]) {
    const v = parseBlogPath(segs);
    assert.deepEqual(parseBlogPath(blogPath(v).split("/").slice(2)), v);
  }
});

test("slugifyTitle and tagSlug", () => {
  assert.equal(slugifyTitle("Hello, World!"), "hello-world");
  assert.equal(slugifyTitle("Café & Crème brûlée"), "cafe-and-creme-brulee");
  assert.equal(slugifyTitle("!!!"), "post");
  assert.equal(slugifyTitle("Tag"), "tag-post");
  assert.ok(slugifyTitle("a ".repeat(100)).length <= 80);
  assert.ok(!slugifyTitle("a ".repeat(100)).endsWith("-"));
  assert.equal(tagSlug("Brand Strategy"), "brand-strategy");
});

test("tags, related posts and paging", () => {
  const posts = [post("1", ["News", "Brand Strategy"]), post("2", ["news"]), post("3", ["Events"]), post("4", [])];
  assert.deepEqual(allTags(posts).map((t) => [t.slug, t.count]), [["news", 2], ["brand-strategy", 1], ["events", 1]]);
  assert.deepEqual(postsForTag(posts, "news").map((p) => p.id), ["1", "2"]);
  assert.equal(tagLabel(posts, "brand-strategy"), "Brand Strategy");
  assert.equal(tagLabel(posts, "nope"), null);
  assert.deepEqual(relatedPosts(posts, posts[1], 2).map((p) => p.id), ["1", "3"]);
  const p = paginate([1, 2, 3, 4, 5], 2, 2);
  assert.deepEqual(p, { items: [3, 4], pages: 3 });
  assert.equal(paginate([], 1).pages, 1);
});

test("reading time, excerpt and date", () => {
  assert.equal(readingMinutes(""), 1);
  assert.equal(readingMinutes(`<p>${"word ".repeat(1100)}</p>`), 5);
  assert.equal(excerptOf("  Given  ", "<p>Body</p>"), "Given");
  assert.equal(excerptOf("", "<p>Short &amp; sweet</p>"), "Short & sweet");
  const long = excerptOf("", `<p>${"lorem ipsum ".repeat(40)}</p>`, 50);
  assert.ok(long.length <= 50 && long.endsWith("…"));
  assert.equal(formatPostDate("2026-03-12T10:00:00Z"), "12 March 2026");
  assert.equal(formatPostDate("nope"), "");
});

test("sanitizePostHtml keeps article markup", () => {
  const html = '<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p><ul><li>One</li></ul><blockquote>Quote</blockquote><hr><p><a href="/about">rel</a></p>';
  assert.equal(sanitizePostHtml(html), html);
  assert.equal(sanitizePostHtml("<h1>Big</h1><div>Block</div>"), "<h2>Big</h2><p>Block</p>");
  assert.equal(
    sanitizePostHtml('<a href="https://x.com/a?b=1&amp;c=2">x</a>'),
    '<a href="https://x.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow">x</a>',
  );
  assert.equal(
    sanitizePostHtml('<img src="https://img.example/a.jpg" alt="A &quot;b&quot;" onerror="x()">'),
    '<img src="https://img.example/a.jpg" alt="A &quot;b&quot;" loading="lazy">',
  );
});

test("sanitizePostHtml strips scripts, handlers and bad URLs", () => {
  assert.equal(sanitizePostHtml("<p>a<script>alert(1)</script>b</p>"), "<p>ab</p>");
  assert.equal(sanitizePostHtml("<style>p{}</style><p>x</p>"), "<p>x</p>");
  assert.equal(sanitizePostHtml('<p onclick="x()" style="color:red" class="c">x</p>'), "<p>x</p>");
  assert.equal(sanitizePostHtml('<a href="javascript:alert(1)">x</a>'), "<a>x</a>");
  assert.equal(sanitizePostHtml('<a href="java&#x09;script:alert(1)">x</a>'), "<a>x</a>");
  assert.equal(sanitizePostHtml('<a href="JaVaScRiPt&colon;alert(1)">x</a>'), "<a>x</a>");
  assert.equal(sanitizePostHtml('<a href="data:text/html,x">x</a>'), "<a>x</a>");
  assert.equal(sanitizePostHtml('<a href="//evil.com">x</a>'), "<a>x</a>");
  assert.equal(sanitizePostHtml('<img src="http://plain.com/a.jpg">'), "");
  assert.equal(sanitizePostHtml('<img src="data:image/png;base64,AA">'), "");
  assert.equal(sanitizePostHtml("<iframe src=x></iframe><p>ok</p>"), "<p>ok</p>");
  assert.equal(sanitizePostHtml("<svg><script>x</script></svg>ok"), "ok");
  assert.equal(sanitizePostHtml("<!-- <script>x</script> -->ok"), "ok");
  assert.equal(sanitizePostHtml("<p>1 < 2 > 0</p>"), "<p>1 &lt; 2 &gt; 0</p>");
  assert.equal(sanitizePostHtml('<p title="a>b">x</p>'), "<p>x</p>");
  assert.equal(sanitizePostHtml("<script>never closed"), "");
  // Unbalanced quotes never parse as a tag: the whole thing is shown as text.
  assert.ok(!sanitizePostHtml('<a href="#x" "onmouseover="y">z</a>').includes("<a"));
});

test("sanitizePostHtml balances tags", () => {
  assert.equal(sanitizePostHtml("<p><strong>open"), "<p><strong>open</strong></p>");
  assert.equal(sanitizePostHtml("</p>stray</em>"), "stray");
  assert.equal(sanitizePostHtml("<ul><li>a<li>b</ul>"), "<ul><li>a<li>b</li></li></ul>");
});

test("safeUrl", () => {
  assert.equal(safeUrl("mailto:a@b.co", "href"), "mailto:a@b.co");
  assert.equal(safeUrl("tel:+234", "href"), "tel:+234");
  assert.equal(safeUrl("vbscript:x", "href"), null);
  assert.equal(safeUrl("https://a.b/c.jpg", "src"), "https://a.b/c.jpg");
  assert.equal(safeUrl("/rel.jpg", "src"), null);
});

test("buildRssFeed escapes text and links each post", async () => {
  const { buildRssFeed } = await import("../src/lib/blog/feed.ts");
  const xml = buildRssFeed({
    siteName: "Ada & Co <Blog>",
    description: "News",
    origin: "https://ada.example.com",
    posts: [post("1", ["News & Notes"], { slug: "hello", title: "Hi \"there\"", excerpt: "a < b", authorName: "Ada" })],
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes("<title>Ada &amp; Co &lt;Blog&gt;</title>"));
  assert.ok(xml.includes("<link>https://ada.example.com/blog/hello</link>"));
  assert.ok(xml.includes("<title>Hi &quot;there&quot;</title>"));
  assert.ok(xml.includes("<description>a &lt; b</description>"));
  assert.ok(xml.includes("<category>News &amp; Notes</category>"));
  assert.ok(xml.includes("<dc:creator>Ada</dc:creator>"));
  assert.ok(xml.includes('href="https://ada.example.com/blog/feed.xml"'));
});

test("navPageHref: extra pages under /p, built-in sections at their own path", async () => {
  const { navPageHref } = await import("../src/templates/shared/links.ts");
  assert.equal(navPageHref("", { key: "services" }), "/p/services");
  assert.equal(navPageHref("/kings", { key: "services" }), "/kings/p/services");
  assert.equal(navPageHref("/kings", { key: "blog", href: "/blog" }), "/kings/blog");
});

test("blogHeroPage frames list, tag and post views", async () => {
  const { blogHeroPage } = await import("../src/lib/blog/hero.ts");
  const posts = [post("1", ["News"], { title: "First", excerpt: "Ex" })];
  const blog = { siteId: "s", label: "Blog", posts };
  assert.equal(blogHeroPage(blog, { kind: "list", page: 1 }, undefined, "Ada").sections[0].headline, "Blog");
  const tag = blogHeroPage(blog, { kind: "tag", tag: "news", page: 1 }, undefined, "Ada").sections[0];
  assert.equal(tag.headline, "News");
  assert.equal(tag.subtext, "1 post from Ada.");
  const p = blogHeroPage(blog, { kind: "post", slug: "p-1" }, posts[0], "Ada").sections[0];
  assert.deepEqual([p.headline, p.subtext, p.ctaText], ["First", "Ex", ""]);
});
