/** A published post as the public site sees it (body only on the post view). */
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string;
  authorName: string;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  /** Minutes to read (kept from the body by the database trigger). */
  readMinutes: number;
  seoTitle: string;
  seoDescription: string;
};

/** Everything a site's blog shows: posts newest first (featured first among equals is up to the view). */
export type BlogData = {
  siteId: string;
  /** Nav / heading label, e.g. "Blog" or "Journal". */
  label: string;
  posts: BlogPost[];
};

/**
 *   /blog                -> list (page 1)
 *   /blog/page/<n>       -> list (page n)
 *   /blog/tag/<tag>      -> tag
 *   /blog/<slug>         -> post
 */
export type BlogView =
  | { kind: "list"; page: number }
  | { kind: "tag"; tag: string; page: number }
  | { kind: "post"; slug: string };

/** A row of public.blog_posts as the dashboard reads and writes it. */
export type BlogPostRow = {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  cover_alt: string;
  author_name: string;
  tags: string[];
  featured: boolean;
  read_minutes?: number;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  created_at?: string;
  updated_at?: string;
};
