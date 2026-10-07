"use client";

import Link from "next/link";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { allTags, blogPath, formatPostDate } from "@/lib/blog/blogPath";
import type { BlogPost } from "@/lib/blog/types";
import { blogHref, useT17 } from "../ctx";
import { IconArrow } from "../icons";

function Meta({ post }: { post: BlogPost }) {
  return (
    <p className="t17-meta">
      {post.authorName ? <span>{post.authorName}</span> : null}
      <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
      <span>{post.readMinutes} min</span>
    </p>
  );
}

/**
 * The home page's reason to exist: the lead story (featured, else newest), then the next posts as
 * ruled rows with a date column and a thumbnail, then topics. Hidden until something is published
 * (the editor shows a hint instead).
 */
export default function T17Feed() {
  const ctx = useT17();
  const { blog, baseUrl } = ctx;
  const editor = useInlineEditor();
  const posts = blog?.posts ?? [];

  if (posts.length === 0) {
    if (!editor?.enabled) return null;
    return (
      <section className="t17-section">
        <div className="t17-container">
          <div className="t17-feed-empty">
            <strong>Your latest posts appear here.</strong> Write and publish your first post on the Blog tab of your dashboard.
          </div>
        </div>
      </section>
    );
  }

  const lead = posts.find((p) => p.featured) ?? posts[0]!;
  const rest = posts.filter((p) => p !== lead).slice(0, 6);
  const tags = allTags(posts).slice(0, 10);
  const href = (p: BlogPost) => `${baseUrl}${blogPath({ kind: "post", slug: p.slug })}`;

  return (
    <section className="t17-section t17-feed" aria-labelledby="t17-latest">
      <div className="t17-container">
        <div className="t17-rule-head t17-reveal">
          <h2 id="t17-latest" className="t17-kicker">
            The latest
          </h2>
          <Link href={blogHref(ctx)} className="t17-link-arrow">
            All {blog?.label.toLowerCase() === "journal" ? "writing" : "posts"} <IconArrow size={16} />
          </Link>
        </div>

        <article className="t17-story t17-reveal" data-cover={!!lead.coverUrl}>
          {lead.coverUrl ? (
            <Link href={href(lead)} className="t17-lead-media" tabIndex={-1} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lead.coverUrl} alt="" />
            </Link>
          ) : null}
          <div className="t17-lead-body">
            {lead.tags[0] ? <p className="t17-tag">{lead.tags[0]}</p> : null}
            <h3 className="t17-lead-title">
              <Link href={href(lead)}>{lead.title}</Link>
            </h3>
            {lead.excerpt ? <p className="t17-lead-excerpt">{lead.excerpt}</p> : null}
            <Meta post={lead} />
            <Link href={href(lead)} className="t17-btn t17-btn-ghost t17-btn-sm">
              Read the story <IconArrow size={16} />
            </Link>
          </div>
        </article>

        {rest.length > 0 ? (
          <ol className="t17-rows">
            {rest.map((p) => (
              <li key={p.id} className="t17-row t17-reveal">
                <time className="t17-row-date" dateTime={p.publishedAt}>
                  {formatPostDate(p.publishedAt)}
                </time>
                <div className="t17-row-body">
                  {p.tags[0] ? <p className="t17-tag">{p.tags[0]}</p> : null}
                  <h3 className="t17-row-title">
                    <Link href={href(p)}>{p.title}</Link>
                  </h3>
                  {p.excerpt ? <p className="t17-row-excerpt">{p.excerpt}</p> : null}
                  <p className="t17-meta t17-row-meta">
                    {p.authorName ? <span>{p.authorName}</span> : null}
                    <span>{p.readMinutes} min read</span>
                  </p>
                </div>
                {p.coverUrl ? (
                  <Link href={href(p)} className="t17-row-thumb" tabIndex={-1} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverUrl} alt="" loading="lazy" />
                  </Link>
                ) : (
                  <span className="t17-row-thumb t17-row-thumb-empty" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        ) : null}

        {tags.length > 1 ? (
          <nav className="t17-topics t17-reveal" aria-label="Topics">
            <span className="t17-kicker">Browse by topic</span>
            <div>
              {tags.map((t) => (
                <Link key={t.slug} href={`${baseUrl}${blogPath({ kind: "tag", tag: t.slug, page: 1 })}`} className="t17-chip">
                  {t.label}
                  <small>{t.count}</small>
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
