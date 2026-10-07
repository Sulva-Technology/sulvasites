"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge, btnCls, cardCls, errMsg, Notice } from "@/components/shop-admin/common";
import { formatPostDate } from "@/lib/blog/blogPath";
import type { BlogPostRow } from "@/lib/blog/types";
import { getAuthenticatedClient } from "@/lib/supabase/browser";

const LIST_COLS = "id, slug, title, excerpt, cover_url, tags, featured, status, published_at, updated_at";
type ListRow = Pick<BlogPostRow, "id" | "slug" | "title" | "excerpt" | "cover_url" | "tags" | "featured" | "status" | "published_at" | "updated_at">;

function platformDomain() {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site").trim().toLowerCase();
}

/** The site's public address, for "View" links (platform subdomain). */
export function useSitePublicUrl(siteId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getAuthenticatedClient();
      const { data } = await db.from("sites").select("slug, status").eq("id", siteId).maybeSingle();
      const row = data as { slug?: string; status?: string } | null;
      if (!cancelled && row?.slug) setUrl(`https://${row.slug}.${platformDomain()}`);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return url;
}

/** True when a PostgREST error means migration 017 has not been applied yet. */
export function isMissingBlogTable(e: unknown): boolean {
  const x = e as { code?: string; message?: string } | null;
  return !!x && (x.code === "42P01" || x.code === "PGRST205" || (/blog_posts/.test(x.message ?? "") && /does not exist|schema cache/i.test(x.message ?? "")));
}

export function postState(p: Pick<BlogPostRow, "status" | "published_at">): { label: string; tone: "green" | "amber" | "gray" } {
  if (p.status !== "published") return { label: "Draft", tone: "gray" };
  if (p.published_at && new Date(p.published_at).getTime() > Date.now()) return { label: "Scheduled", tone: "amber" };
  return { label: "Published", tone: "green" };
}

/** Post list for /dashboard/[siteId]/blog and /admin/sites/[siteId]/blog. */
export default function BlogManager({ siteId, basePath }: { siteId: string; basePath: string }) {
  const [posts, setPosts] = useState<ListRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const siteUrl = useSitePublicUrl(siteId);

  const load = useCallback(async () => {
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db
        .from("blog_posts")
        .select(LIST_COLS)
        .eq("site_id", siteId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setPosts((data ?? []) as ListRow[]);
    } catch (e) {
      if (isMissingBlogTable(e)) setMissing(true);
      else setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (missing) {
    return <Notice kind="warn">The blog isn&apos;t set up yet. Ask Sulvatech to run database update 017.</Notice>;
  }

  const live = posts.filter((p) => postState(p).label === "Published").length;

  return (
    <div className="space-y-4">
      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-koi-ink">Blog</h2>
          <p className="mt-1 text-sm text-koi-ink/60">
            {live > 0 ? (
              <>
                {live} published {live === 1 ? "post" : "posts"}. Your site shows a Blog link in its menu.
                {siteUrl ? (
                  <>
                    {" "}
                    <a href={`${siteUrl}/blog`} target="_blank" rel="noreferrer" className="text-koi-deep underline">
                      View blog
                    </a>
                  </>
                ) : null}
              </>
            ) : (
              "Share news, guides and stories. A Blog link appears on your site once you publish your first post."
            )}
          </p>
        </div>
        <Link href={`${basePath}/new`} className={btnCls}>
          New post
        </Link>
      </div>

      {err ? <Notice kind="error">{err}</Notice> : null}
      {!loaded ? <p className="text-sm text-koi-ink/60">Loading…</p> : null}

      {loaded && posts.length === 0 && !err ? (
        <div className={`${cardCls} text-center`}>
          <p className="text-sm text-koi-ink/70">No posts yet.</p>
          <p className="mt-1 text-sm text-koi-ink/50">Ideas: answer a question customers often ask, share news, or show behind the scenes.</p>
        </div>
      ) : null}

      {posts.length > 0 ? (
        <ul className={`${cardCls} divide-y divide-koi-ink/5 p-0`}>
          {posts.map((p) => {
            const state = postState(p);
            return (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-koi-ink/5">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`${basePath}/${p.id}`} className="block truncate text-sm font-semibold text-koi-ink hover:underline">
                    {p.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-koi-ink/55">
                    <Badge tone={state.tone}>{state.label}</Badge>
                    {p.featured ? <Badge tone="blue">Featured</Badge> : null}
                    <span>
                      {p.published_at && p.status === "published"
                        ? formatPostDate(p.published_at)
                        : `Edited ${formatPostDate(p.updated_at ?? "")}`}
                    </span>
                    {p.tags.length > 0 ? <span className="truncate">· {p.tags.join(", ")}</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  {state.label === "Published" && siteUrl ? (
                    <a href={`${siteUrl}/blog/${p.slug}`} target="_blank" rel="noreferrer" className="hidden text-koi-deep underline sm:inline">
                      View
                    </a>
                  ) : null}
                  <Link href={`${basePath}/${p.id}`} className="font-medium text-koi-ink hover:underline">
                    Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
