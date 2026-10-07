/** RSS 2.0 feed for a site's blog (pure; unit-tested). */
import type { BlogPost } from "./types.ts";

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters XML 1.0 forbids (C0 controls other than tab, newline and carriage return).
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

export function buildRssFeed(opts: {
  siteName: string;
  description: string;
  /** e.g. "https://kings.example.com" (no trailing slash). */
  origin: string;
  posts: BlogPost[];
  limit?: number;
}): string {
  const { siteName, description, origin, posts } = opts;
  const items = posts.slice(0, opts.limit ?? 30).map((p) => {
    const link = `${origin}/blog/${p.slug}`;
    return [
      "    <item>",
      `      <title>${xml(p.title)}</title>`,
      `      <link>${xml(link)}</link>`,
      `      <guid isPermaLink="true">${xml(link)}</guid>`,
      `      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>`,
      p.excerpt ? `      <description>${xml(p.excerpt)}</description>` : null,
      p.authorName ? `      <dc:creator>${xml(p.authorName)}</dc:creator>` : null,
      ...p.tags.map((t) => `      <category>${xml(t)}</category>`),
      "    </item>",
    ]
      .filter(Boolean)
      .join("\n");
  });
  const latest = posts[0]?.publishedAt;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${xml(siteName)}</title>`,
    `    <link>${xml(`${origin}/blog`)}</link>`,
    `    <atom:link href="${xml(`${origin}/blog/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    `    <description>${xml(description)}</description>`,
    "    <language>en</language>",
    latest ? `    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : null,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
}
