import Link from "next/link";

import {
  allTags,
  blogPath,
  formatPostDate,
  paginate,
  postsForTag,
  tagSlug,
} from "@/lib/blog/blogPath";
import type { BlogData, BlogPost, BlogView } from "@/lib/blog/types";
import { blogThemeVars } from "./theme";
import "./blog.css";

/**
 * Blog lists and articles shared by every template. They render inside the template's <main>
 * after its own extra-page hero (title, breadcrumb), and take the template's palette and
 * headline font through blogThemeVars.
 */

function PostMeta({ post, author = true }: { post: BlogPost; author?: boolean }) {
  return (
    <p className="sb-meta">
      {author && post.authorName ? <span>{post.authorName}</span> : null}
      <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
      <span>{post.readMinutes} min read</span>
    </p>
  );
}

export function PostCard({ post, baseUrl, large = false }: { post: BlogPost; baseUrl: string; large?: boolean }) {
  const href = `${baseUrl}${blogPath({ kind: "post", slug: post.slug })}`;
  return (
    <article className={`sb-card${large ? " sb-card-lg" : ""}${post.coverUrl ? "" : " sb-card-plain"}`}>
      {post.coverUrl ? (
        <Link href={href} className="sb-card-media" tabIndex={-1} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt="" loading={large ? "eager" : "lazy"} />
        </Link>
      ) : null}
      <div className="sb-card-body">
        {post.tags[0] ? <p className="sb-kicker">{post.tags[0]}</p> : null}
        <h3 className="sb-card-title">
          <Link href={href}>{post.title}</Link>
        </h3>
        {post.excerpt ? <p className="sb-card-excerpt">{post.excerpt}</p> : null}
        <PostMeta post={post} />
      </div>
    </article>
  );
}

function TagBar({ blog, baseUrl, active }: { blog: BlogData; baseUrl: string; active: string | null }) {
  const tags = allTags(blog.posts).slice(0, 12);
  if (tags.length === 0) return null;
  return (
    <nav className="sb-tags" aria-label="Topics">
      <Link href={`${baseUrl}/blog`} className="sb-chip" aria-current={active === null ? "page" : undefined}>
        All
      </Link>
      {tags.map((t) => (
        <Link
          key={t.slug}
          href={`${baseUrl}${blogPath({ kind: "tag", tag: t.slug, page: 1 })}`}
          className="sb-chip"
          aria-current={active === t.slug ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function Pager({ view, pages, baseUrl }: { view: Extract<BlogView, { kind: "list" | "tag" }>; pages: number; baseUrl: string }) {
  if (pages <= 1) return null;
  const at = (page: number) => `${baseUrl}${blogPath({ ...view, page })}`;
  return (
    <nav className="sb-pager" aria-label="Pages">
      {view.page > 1 ? <Link href={at(view.page - 1)} rel="prev">← Newer</Link> : <span />}
      <span className="sb-pager-at">
        Page {view.page} of {pages}
      </span>
      {view.page < pages ? <Link href={at(view.page + 1)} rel="next">Older →</Link> : <span />}
    </nav>
  );
}

/** /blog, /blog/page/n, /blog/tag/x: a lead story on the first page, then a grid. */
export function BlogIndex({
  blog,
  view,
  baseUrl,
  templateKey,
}: {
  blog: BlogData;
  view: Extract<BlogView, { kind: "list" | "tag" }>;
  baseUrl: string;
  templateKey: string;
}) {
  const source = view.kind === "tag" ? postsForTag(blog.posts, view.tag) : blog.posts;
  // The list leads with the newest featured post (else the newest) on page 1; the grid pages the rest.
  const lead = view.kind === "list" ? (source.find((p) => p.featured) ?? source[0]) : undefined;
  const rest = lead ? source.filter((p) => p !== lead) : source;
  const { items, pages } = paginate(rest, view.page);
  const showLead = lead && view.page === 1;

  return (
    <section className="sb-blog" style={blogThemeVars(templateKey)}>
      <div className="sb-wrap">
        <TagBar blog={blog} baseUrl={baseUrl} active={view.kind === "tag" ? view.tag : null} />
        {showLead ? <PostCard post={lead} baseUrl={baseUrl} large /> : null}
        {items.length > 0 ? (
          <div className="sb-grid">
            {items.map((p) => (
              <PostCard key={p.id} post={p} baseUrl={baseUrl} />
            ))}
          </div>
        ) : !showLead ? (
          <p className="sb-empty">No posts here yet.</p>
        ) : null}
        <Pager view={view} pages={pages} baseUrl={baseUrl} />
      </div>
    </section>
  );
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];
  return (
    <div className="sb-share">
      <span>Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="sb-chip">
          {l.label}
        </a>
      ))}
    </div>
  );
}

/** /blog/<slug>: meta, cover, body, tags, share and related posts. */
export function BlogArticle({
  post,
  bodyHtml,
  related,
  baseUrl,
  templateKey,
  label,
  canonicalUrl,
}: {
  post: BlogPost;
  /** Already sanitised (sanitizePostHtml). */
  bodyHtml: string;
  related: BlogPost[];
  baseUrl: string;
  templateKey: string;
  label: string;
  canonicalUrl?: string;
}) {
  return (
    <section className="sb-blog" style={blogThemeVars(templateKey)}>
      <article className="sb-article">
        <div className="sb-article-head">
          <Link href={`${baseUrl}/blog`} className="sb-back">
            ← {label === "Blog" ? "All posts" : `Back to the ${label.toLowerCase()}`}
          </Link>
          <PostMeta post={post} />
        </div>
        {post.coverUrl ? (
          <figure className="sb-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt={post.coverAlt} />
            {post.coverAlt ? <figcaption>{post.coverAlt}</figcaption> : null}
          </figure>
        ) : null}
        <div className="sb-prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <footer className="sb-article-foot">
          {post.tags.length > 0 ? (
            <div className="sb-tags sb-tags-inline">
              {post.tags.map((t) => (
                <Link key={t} href={`${baseUrl}${blogPath({ kind: "tag", tag: tagSlug(t), page: 1 })}`} className="sb-chip">
                  {t}
                </Link>
              ))}
            </div>
          ) : null}
          {canonicalUrl ? <ShareLinks url={canonicalUrl} title={post.title} /> : null}
        </footer>
      </article>
      {related.length > 0 ? (
        <div className="sb-wrap sb-related">
          <h2 className="sb-related-title">Keep reading</h2>
          <div className="sb-grid">
            {related.map((p) => (
              <PostCard key={p.id} post={p} baseUrl={baseUrl} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

