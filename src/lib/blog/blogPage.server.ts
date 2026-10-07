import type { Metadata } from "next";

import { buildSiteMetadata, type PublicSiteContext } from "@/lib/publicSite.server";

import { blogPath, parseBlogPath, POSTS_PER_PAGE, postsForTag, relatedPosts, tagLabel } from "./blogPath";
import { loadPostBody, loadPublicBlog } from "./load.server";
import { sanitizePostHtml } from "./sanitize";
import type { BlogData, BlogPost, BlogView } from "./types";

export type BlogPageContext = {
  ctx: PublicSiteContext;
  blog: BlogData;
  view: BlogView;
  /** Set on post views. */
  post?: BlogPost;
  /** Sanitised body HTML (post views). */
  bodyHtml?: string;
};

/**
 * Resolves a /blog request, or null (=> 404) when the path is malformed, the site has no published
 * posts, or the post / tag / page doesn't exist.
 */
export async function loadBlogPage(
  ctx: PublicSiteContext | null,
  segments: string[] | undefined,
): Promise<BlogPageContext | null> {
  if (!ctx) return null;
  const view = parseBlogPath(segments);
  if (!view) return null;
  const { site } = ctx.siteData;
  const blog = await loadPublicBlog(site.id, site.template_key);
  if (!blog) return null;

  if (view.kind === "post") {
    const post = blog.posts.find((p) => p.slug === view.slug);
    if (!post) return null;
    const body = await loadPostBody(site.id, view.slug);
    if (body === null) return null;
    return { ctx, blog, view, post, bodyHtml: sanitizePostHtml(body) };
  }

  const source = view.kind === "tag" ? postsForTag(blog.posts, view.tag) : blog.posts;
  if (source.length === 0) return null;
  // The list's first page leads with one post outside the grid; later pages page the rest.
  const gridCount = view.kind === "list" ? source.length - 1 : source.length;
  if (view.page > Math.max(1, Math.ceil(gridCount / POSTS_PER_PAGE))) return null;
  return { ctx, blog, view };
}

export function blogRelated(page: BlogPageContext): BlogPost[] {
  return page.post ? relatedPosts(page.blog.posts, page.post, 3) : [];
}

export function canonicalBlogUrl(ctx: PublicSiteContext, view: BlogView): string | undefined {
  return ctx.canonicalHost ? `https://${ctx.canonicalHost}${blogPath(view)}` : undefined;
}

export function buildBlogMetadata(page: BlogPageContext): Metadata {
  const { ctx, blog, view, post } = page;
  const name = ctx.siteData.profile.business_name;
  let title = `${blog.label} | ${name}`;
  let description = `News, ideas and stories from ${name}.`;
  if (view.kind === "tag") {
    title = `${tagLabel(blog.posts, view.tag) ?? view.tag} | ${blog.label} | ${name}`;
  } else if (post) {
    title = post.seoTitle || `${post.title} | ${name}`;
    description = post.seoDescription || post.excerpt || description;
  }
  if (view.kind !== "post" && view.page > 1) title = `${title} (page ${view.page})`;

  const meta = buildSiteMetadata(ctx, { kind: "extra", key: "blog", data: { seo: { title, description }, sections: [] } });
  const canonical = canonicalBlogUrl(ctx, view);
  const origin = ctx.canonicalHost ? `https://${ctx.canonicalHost}` : undefined;
  const og = meta.openGraph as Record<string, unknown> | null | undefined;
  const image = post?.coverUrl ?? undefined;

  return {
    ...meta,
    keywords: post?.tags.length ? post.tags.join(", ") : undefined,
    authors: post?.authorName ? [{ name: post.authorName }] : meta.authors,
    openGraph: {
      ...(og as object),
      url: canonical,
      ...(post
        ? {
            type: "article",
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            tags: post.tags,
            ...(post.authorName ? { authors: [post.authorName] } : {}),
          }
        : {}),
      ...(image ? { images: [{ url: image, alt: post?.coverAlt || title }] } : {}),
    } as Metadata["openGraph"],
    twitter: image ? { card: "summary_large_image", title, description, images: [image] } : meta.twitter,
    alternates: {
      ...(canonical ? { canonical } : {}),
      ...(origin ? { types: { "application/rss+xml": [{ url: `${origin}/blog/feed.xml`, title: `${name} ${blog.label}` }] } } : {}),
    },
  };
}

/** schema.org BlogPosting for posts, Blog for lists. */
export function buildBlogJsonLd(page: BlogPageContext) {
  const { ctx, blog, view, post } = page;
  const name = ctx.siteData.profile.business_name;
  const url = canonicalBlogUrl(ctx, view);
  const publisher = {
    "@type": "Organization",
    name,
    ...(ctx.logoUrl && { logo: { "@type": "ImageObject", url: ctx.logoUrl } }),
  };
  if (post) {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      ...(post.excerpt && { description: post.excerpt }),
      ...(post.coverUrl && { image: [post.coverUrl] }),
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: post.authorName ? { "@type": "Person", name: post.authorName } : publisher,
      publisher,
      ...(url && { url, mainEntityOfPage: url }),
      ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${name} ${blog.label}`,
    ...(url && { url }),
    publisher,
  };
}
