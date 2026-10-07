/** Pure helpers for blog routes, slugs and post text. Relative imports only (unit-tested). */
import type { BlogPost, BlogView } from "./types.ts";

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Mirrors the blog_posts.slug CHECK in 017_blog_posts.sql. */
export const RESERVED_POST_SLUGS = new Set(["tag", "feed", "page"]);
export const POSTS_PER_PAGE = 12;
/** Nav key of the blog entry; templates highlight it via currentExtraKey on /blog routes. */
export const BLOG_NAV_KEY = "blog";

/** "Hello, World!" -> "hello-world" (max 80 chars, never a reserved word). */
export function slugifyTitle(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  if (!s) return "post";
  return RESERVED_POST_SLUGS.has(s) ? `${s}-post` : s;
}

/** URL form of a tag: "Brand Strategy" -> "brand-strategy". */
export function tagSlug(tag: string): string {
  return tag
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decode(segments: string[] | undefined): string[] | null {
  const out: string[] = [];
  for (const x of segments ?? []) {
    try {
      const d = decodeURIComponent(x);
      if (!d) return null;
      out.push(d);
    } catch {
      return null;
    }
  }
  return out;
}

function pageNumber(raw: string): number | null {
  if (!/^[1-9][0-9]{0,3}$/.test(raw)) return null;
  return Number(raw);
}

/** Maps the catch-all segments after `/blog` to a view, or null for anything unknown/malformed. */
export function parseBlogPath(segments: string[] | undefined): BlogView | null {
  const s = decode(segments);
  if (!s) return null;
  if (s.length === 0) return { kind: "list", page: 1 };
  const [a, b, c, d] = s;
  if (s.length === 1) {
    if (RESERVED_POST_SLUGS.has(a!) || !SLUG_RE.test(a!)) return null;
    return { kind: "post", slug: a! };
  }
  if (s.length === 2 && a === "page") {
    const n = pageNumber(b!);
    return n && n > 1 ? { kind: "list", page: n } : null;
  }
  if (a === "tag" && SLUG_RE.test(b!)) {
    if (s.length === 2) return { kind: "tag", tag: b!, page: 1 };
    if (s.length === 4 && c === "page") {
      const n = pageNumber(d!);
      return n && n > 1 ? { kind: "tag", tag: b!, page: n } : null;
    }
  }
  return null;
}

/** Path suffix (after the site's baseUrl) for a view, e.g. "/blog/tag/news". */
export function blogPath(view: BlogView): string {
  switch (view.kind) {
    case "list":
      return view.page > 1 ? `/blog/page/${view.page}` : "/blog";
    case "tag":
      return view.page > 1 ? `/blog/tag/${view.tag}/page/${view.page}` : `/blog/tag/${view.tag}`;
    case "post":
      return `/blog/${view.slug}`;
  }
}

export function postsForTag(posts: BlogPost[], tag: string): BlogPost[] {
  return posts.filter((p) => p.tags.some((t) => tagSlug(t) === tag));
}

/** The display name of a tag slug, as first written on a post ("brand-strategy" -> "Brand Strategy"). */
export function tagLabel(posts: BlogPost[], tag: string): string | null {
  for (const p of posts) for (const t of p.tags) if (tagSlug(t) === tag) return t;
  return null;
}

/** Every tag in use, most used first. */
export function allTags(posts: BlogPost[]): Array<{ label: string; slug: string; count: number }> {
  const m = new Map<string, { label: string; slug: string; count: number }>();
  for (const p of posts) {
    for (const t of p.tags) {
      const slug = tagSlug(t);
      if (!slug) continue;
      const cur = m.get(slug);
      if (cur) cur.count += 1;
      else m.set(slug, { label: t, slug, count: 1 });
    }
  }
  return [...m.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label));
}

export function paginate<T>(items: T[], page: number, per = POSTS_PER_PAGE): { items: T[]; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / per));
  return { items: items.slice((page - 1) * per, page * per), pages };
}

/** Plain text of an HTML body (tags dropped, common entities decoded, whitespace collapsed). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reading time at ~220 words a minute, at least 1. */
export function readingMinutes(html: string): number {
  const words = htmlToText(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** The excerpt if written, else the opening of the body cut at a word (max chars). */
export function excerptOf(excerpt: string, html: string, max = 200): string {
  const e = excerpt.trim();
  if (e) return e;
  const t = htmlToText(html);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

/** "12 March 2026" in a fixed (server-stable) format. */
export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Up to `n` other posts, those sharing a tag first, then the newest. */
export function relatedPosts(posts: BlogPost[], current: BlogPost, n = 3): BlogPost[] {
  const tags = new Set(current.tags.map(tagSlug));
  const others = posts.filter((p) => p.id !== current.id);
  const shared = others.filter((p) => p.tags.some((t) => tags.has(tagSlug(t))));
  const rest = others.filter((p) => !shared.includes(p));
  return [...shared, ...rest].slice(0, n);
}

/** Nav label for a template's blog ("Journal" on the blog-first template). */
export function blogLabelFor(templateKey: string): string {
  return templateKey === "t17" ? "Journal" : "Blog";
}
