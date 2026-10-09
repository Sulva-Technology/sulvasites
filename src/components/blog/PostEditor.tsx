"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ImageField, { SiteImageProvider } from "@/components/page-editor/ImageField";
import { Badge, btnCls, btnDangerCls, btnGhostCls, cardCls, errMsg, inputCls, Notice } from "@/components/shop-admin/common";
import { excerptOf, RESERVED_POST_SLUGS, SLUG_RE, slugifyTitle } from "@/lib/blog/blogPath";
import type { BlogPostRow } from "@/lib/blog/types";
import { notifySearchEngines } from "@/lib/search/notifyClient";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { isMissingBlogTable, postState, useSitePublicUrl } from "./BlogManager";
import PostBodyEditor from "./PostBodyEditor";

const COLS =
  "id, site_id, slug, title, excerpt, body, cover_url, cover_alt, author_name, tags, featured, status, published_at, seo_title, seo_description, updated_at";

type Form = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string;
  cover_alt: string;
  author_name: string;
  tags: string;
  featured: boolean;
  /** datetime-local value ("" = now when publishing). */
  publish_at: string;
  seo_title: string;
  seo_description: string;
};

const EMPTY: Form = {
  title: "", slug: "", excerpt: "", body: "", cover_url: "", cover_alt: "", author_name: "", tags: "",
  featured: false, publish_at: "", seo_title: "", seo_description: "",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToForm(r: BlogPostRow): Form {
  return {
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    body: r.body ?? "",
    cover_url: r.cover_url ?? "",
    cover_alt: r.cover_alt ?? "",
    author_name: r.author_name ?? "",
    tags: (r.tags ?? []).join(", "),
    featured: !!r.featured,
    publish_at: toLocalInput(r.published_at),
    seo_title: r.seo_title ?? "",
    seo_description: r.seo_description ?? "",
  };
}

export function parseTags(raw: string): string[] {
  const out: string[] = [];
  for (const t of raw.split(",")) {
    const v = t.trim().replace(/\s+/g, " ").slice(0, 40);
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, 8);
}

/** Editor for /…/blog/new and /…/blog/[postId] (owners and admins). */
export default function PostEditor({ siteId, postId, basePath }: { siteId: string; postId: string; basePath: string }) {
  return (
    <SiteImageProvider siteId={siteId}>
      <Inner siteId={siteId} postId={postId} basePath={basePath} />
    </SiteImageProvider>
  );
}

function Inner({ siteId, postId, basePath }: { siteId: string; postId: string; basePath: string }) {
  const router = useRouter();
  const isNew = postId === "new";
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<BlogPostRow | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const siteUrl = useSitePublicUrl(siteId);
  const savedForm = useRef<string>(JSON.stringify(EMPTY));
  const dirty = JSON.stringify(form) !== savedForm.current;

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const db = await getAuthenticatedClient();
      const { data, error } = await db.from("blog_posts").select(COLS).eq("id", postId).eq("site_id", siteId).maybeSingle();
      if (error) throw error;
      if (!data) {
        setErr("This post was not found. It may have been deleted.");
        return;
      }
      const row = data as BlogPostRow;
      const f = rowToForm(row);
      setSaved(row);
      setForm(f);
      savedForm.current = JSON.stringify(f);
    } catch (e) {
      if (isMissingBlogTable(e)) setMissing(true);
      else setErr(errMsg(e));
    } finally {
      setLoaded(true);
    }
  }, [isNew, postId, siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "title" && !slugTouched) next.slug = slugifyTitle(String(v));
      return next;
    });

  const slugError = useMemo(() => {
    const s = form.slug;
    if (!s) return "Add a web address.";
    if (!SLUG_RE.test(s) || s.length > 80) return "Use lowercase letters, numbers and single dashes only.";
    if (RESERVED_POST_SLUGS.has(s)) return `"${s}" is reserved. Pick another web address.`;
    return null;
  }, [form.slug]);

  async function save(status: "draft" | "published") {
    setErr(null);
    setOk(null);
    if (!form.title.trim()) return setErr("Give your post a title.");
    if (slugError) return setErr(slugError);
    if (form.cover_url && !/^https:\/\//i.test(form.cover_url)) return setErr("The cover photo must be an https:// link.");
    let publishedAt: string | null = saved?.published_at ?? null;
    if (status === "published") {
      if (form.publish_at) {
        const d = new Date(form.publish_at);
        if (Number.isNaN(d.getTime())) return setErr("The publish date isn't valid.");
        publishedAt = d.toISOString();
      } else {
        publishedAt = publishedAt ?? new Date().toISOString();
      }
    } else if (!saved || saved.status !== "published") {
      publishedAt = form.publish_at ? new Date(form.publish_at).toISOString() : null;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug,
      excerpt: excerptOf(form.excerpt, form.body, 200).slice(0, 400),
      body: form.body,
      cover_url: form.cover_url.trim() || null,
      cover_alt: form.cover_alt.trim().slice(0, 200),
      author_name: form.author_name.trim().slice(0, 80),
      tags: parseTags(form.tags),
      featured: form.featured,
      status,
      published_at: publishedAt,
      seo_title: form.seo_title.trim().slice(0, 160),
      seo_description: form.seo_description.trim().slice(0, 320),
    };

    setBusy(true);
    try {
      const db = await getAuthenticatedClient();
      if (isNew) {
        const { data, error } = await db.from("blog_posts").insert({ site_id: siteId, ...payload }).select("id").single();
        if (error) throw error;
        if (status === "published") notifySearchEngines(siteId);
        savedForm.current = JSON.stringify(form);
        router.replace(`${basePath}/${(data as { id: string }).id}`);
        return;
      }
      const { error } = await db.from("blog_posts").update(payload).eq("id", postId).eq("site_id", siteId);
      if (error) throw error;
      if (status === "published") notifySearchEngines(siteId);
      await load();
      setOk(status === "published" ? "Published. Your post is live." : "Saved as a draft. Visitors can't see it.");
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      setErr(code === "23505" ? "Another post already uses this web address. Change it and try again." : errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (isNew || !window.confirm(`Delete "${form.title || "this post"}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const db = await getAuthenticatedClient();
      const { error } = await db.from("blog_posts").delete().eq("id", postId).eq("site_id", siteId);
      if (error) throw error;
      savedForm.current = JSON.stringify(form);
      router.replace(basePath);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  if (missing) return <Notice kind="warn">The blog isn&apos;t set up yet. Ask Sulvatech to run database update 017.</Notice>;
  if (!loaded) return <p className="text-sm text-koi-ink/60">Loading…</p>;

  const state = saved ? postState(saved) : null;
  const isLive = state?.label === "Published";
  const label = "block text-sm font-medium text-koi-ink";

  return (
    <div className="space-y-4">
      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-3 !py-3`}>
        <Link href={basePath} className="text-sm text-koi-deep underline">
          ← All posts
        </Link>
        <div className="flex items-center gap-2">
          {state ? <Badge tone={state.tone}>{state.label}</Badge> : <Badge tone="gray">New post</Badge>}
          {dirty ? <span className="text-xs text-koi-ink/50">Unsaved changes</span> : null}
          {isLive && siteUrl && saved ? (
            <a href={`${siteUrl}/blog/${saved.slug}`} target="_blank" rel="noreferrer" className="text-sm text-koi-deep underline">
              View on site
            </a>
          ) : null}
        </div>
      </div>

      {err ? <Notice kind="error">{err}</Notice> : null}
      {ok ? <Notice kind="ok">{ok}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className={`${cardCls} space-y-4`}>
            <label className={label}>
              Title
              <input
                className={`${inputCls} text-lg font-semibold`}
                value={form.title}
                maxLength={160}
                placeholder="What is this post about?"
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <label className={label}>
              Short summary <span className="font-normal text-koi-ink/50">(shown on the blog page and in Google)</span>
              <textarea
                className={`${inputCls} resize-y`}
                rows={2}
                maxLength={400}
                value={form.excerpt}
                placeholder="Leave empty to use the start of your post."
                onChange={(e) => set("excerpt", e.target.value)}
              />
            </label>
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-koi-ink">Post</span>
            <PostBodyEditor siteId={siteId} value={form.body} resetKey={saved?.id ?? "new"} onChange={(html) => set("body", html)} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className={`${cardCls} space-y-3`}>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnCls} disabled={busy} onClick={() => void save("published")}>
                {busy ? "Saving…" : isLive ? "Update" : form.publish_at && new Date(form.publish_at).getTime() > Date.now() ? "Schedule" : "Publish"}
              </button>
              <button type="button" className={btnGhostCls} disabled={busy} onClick={() => void save("draft")}>
                {isLive || state?.label === "Scheduled" ? "Unpublish" : "Save draft"}
              </button>
            </div>
            <label className={label}>
              Publish date <span className="font-normal text-koi-ink/50">(optional)</span>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.publish_at}
                onChange={(e) => set("publish_at", e.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-koi-ink/50">Pick a future date to schedule the post.</span>
            </label>
          </div>

          <div className={`${cardCls} space-y-3`}>
            <ImageField label="Cover photo" value={form.cover_url} onChange={(url) => set("cover_url", url)} onPick={(url, alt) => { set("cover_url", url); if (!form.cover_alt) set("cover_alt", alt); }} />
            <label className={label}>
              Photo description
              <input className={inputCls} value={form.cover_alt} maxLength={200} placeholder="What's in the photo?" onChange={(e) => set("cover_alt", e.target.value)} />
            </label>
          </div>

          <div className={`${cardCls} space-y-3`}>
            <label className={label}>
              Topics <span className="font-normal text-koi-ink/50">(comma separated)</span>
              <input className={inputCls} value={form.tags} placeholder="News, Guides" onChange={(e) => set("tags", e.target.value)} />
            </label>
            <label className={label}>
              Author
              <input className={inputCls} value={form.author_name} maxLength={80} placeholder="Your name" onChange={(e) => set("author_name", e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-koi-ink">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              Feature at the top of the blog
            </label>
          </div>

          <details className={`${cardCls} space-y-3`}>
            <summary className="cursor-pointer text-sm font-medium text-koi-ink">Web address &amp; Google</summary>
            <label className={`${label} mt-3`}>
              Web address
              <div className="mt-1 flex items-center gap-1 text-sm text-koi-ink/50">
                <span>/blog/</span>
                <input
                  className={`${inputCls} mt-0 font-mono`}
                  value={form.slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                />
              </div>
              {slugError && form.title ? <span className="mt-1 block text-xs text-red-700">{slugError}</span> : null}
            </label>
            <label className={label}>
              Google title
              <input className={inputCls} value={form.seo_title} maxLength={160} placeholder={form.title} onChange={(e) => set("seo_title", e.target.value)} />
            </label>
            <label className={label}>
              Google description
              <textarea className={`${inputCls} resize-y`} rows={3} maxLength={320} value={form.seo_description} placeholder="Leave empty to use the summary." onChange={(e) => set("seo_description", e.target.value)} />
            </label>
          </details>

          {!isNew ? (
            <button type="button" className={btnDangerCls} disabled={busy} onClick={() => void remove()}>
              Delete post
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
