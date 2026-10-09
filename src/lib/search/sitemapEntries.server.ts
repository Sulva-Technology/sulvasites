import { loadPublicBlog } from "@/lib/blog/load.server";
import { loadPublicShop } from "@/lib/shop/loadPublicShop.server";
import { siteUrl, type SitemapEntry } from "@/lib/sitemap";
import { supabaseServer } from "@/lib/supabase/server";

const CORE_PATHS: Record<string, string> = { home: "/", about: "/about", contact: "/contact" };

/** Every public URL of a published site on `host`, with lastmod where the data has one. */
export async function listSitemapEntries(
  site: { id: string; template_key: string },
  host: string,
): Promise<SitemapEntry[]> {
  const db = supabaseServer();
  const [core, extras, blog, shop] = await Promise.all([
    db
      .from("pages")
      .select("key, updated_at")
      .eq("site_id", site.id)
      .eq("status", "published")
      .in("key", Object.keys(CORE_PATHS)),
    db.from("extra_pages").select("key, updated_at").eq("site_id", site.id).eq("status", "published"),
    loadPublicBlog(site.id, site.template_key),
    loadPublicShop(site.id),
  ]);

  const entries: SitemapEntry[] = [];
  const coreRows = ((core.data ?? []) as Array<{ key: string; updated_at: string }>).sort(
    (a, b) => Object.keys(CORE_PATHS).indexOf(a.key) - Object.keys(CORE_PATHS).indexOf(b.key),
  );
  for (const row of coreRows) entries.push({ url: siteUrl(host, CORE_PATHS[row.key]!), lastmod: row.updated_at });
  for (const row of (extras.data ?? []) as Array<{ key: string; updated_at: string }>) {
    entries.push({ url: siteUrl(host, `/p/${encodeURIComponent(row.key)}`), lastmod: row.updated_at });
  }
  if (blog && blog.posts.length > 0) {
    entries.push({ url: siteUrl(host, "/blog"), lastmod: blog.posts[0]!.updatedAt });
    for (const post of blog.posts) {
      entries.push({ url: siteUrl(host, `/blog/${encodeURIComponent(post.slug)}`), lastmod: post.updatedAt });
    }
  }
  if (shop) {
    entries.push({ url: siteUrl(host, "/shop") });
    for (const product of shop.products) entries.push({ url: siteUrl(host, `/shop/${encodeURIComponent(product.slug)}`) });
  }
  return entries;
}
