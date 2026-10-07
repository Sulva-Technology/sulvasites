import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

import { blogLabelFor } from "./blogPath";
import type { BlogData, BlogPost } from "./types";

/** Anon (RLS-enforced) client: only published, already-dated posts of published sites. */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const LIST_COLS =
  "id, slug, title, excerpt, cover_url, cover_alt, author_name, tags, featured, read_minutes, published_at, updated_at, seo_title, seo_description";

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  author_name: string | null;
  tags: string[] | null;
  featured: boolean | null;
  read_minutes: number | null;
  published_at: string;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
};

export function mapPostRow(r: Row): BlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? "",
    coverUrl: r.cover_url,
    coverAlt: r.cover_alt ?? "",
    authorName: r.author_name ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    featured: !!r.featured,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    readMinutes: Math.max(1, r.read_minutes ?? 1),
    seoTitle: r.seo_title ?? "",
    seoDescription: r.seo_description ?? "",
  };
}

/**
 * The site's published posts, newest first (no bodies), or null when there are none or the table
 * isn't there yet (before migration 017). Cached per request.
 */
export const loadPublicBlog = cache(async (siteId: string, templateKey: string): Promise<BlogData | null> => {
  try {
    const { data, error } = await anonClient()
      .from("blog_posts")
      .select(LIST_COLS)
      .eq("site_id", siteId)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(1000);
    if (error || !data || data.length === 0) return null;
    return { siteId, label: blogLabelFor(templateKey), posts: (data as Row[]).map(mapPostRow) };
  } catch {
    return null;
  }
});

/** True when the site has at least one live post (cheap check for the nav on every page). */
export const hasPublishedPosts = cache(async (siteId: string): Promise<boolean> => {
  try {
    const { data, error } = await anonClient()
      .from("blog_posts")
      .select("id")
      .eq("site_id", siteId)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .limit(1);
    return !error && !!data && data.length > 0;
  } catch {
    return false;
  }
});

/** One published post's body HTML (unsanitised; render through sanitizePostHtml). */
export const loadPostBody = cache(async (siteId: string, slug: string): Promise<string | null> => {
  try {
    const { data, error } = await anonClient()
      .from("blog_posts")
      .select("body")
      .eq("site_id", siteId)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    return (data as { body: string }).body ?? "";
  } catch {
    return null;
  }
});
