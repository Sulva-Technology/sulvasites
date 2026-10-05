"use client";

import { useEffect, useState } from "react";

import { useSite } from "@/components/dashboard/SiteShell";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

type PageStatus = { key: string; status: string; extra: boolean };

export default function DashboardOverviewPage() {
  const { siteId, site } = useSite();
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site")
    .trim()
    .toLowerCase();
  const liveUrl = `https://${site.slug}.${platformDomain}`;

  const [pages, setPages] = useState<PageStatus[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseBrowser();
    (async () => {
      try {
        const [core, extra] = await Promise.all([
          supabase.from("pages").select("key, status").eq("site_id", siteId).order("key"),
          supabase.from("extra_pages").select("key, status").eq("site_id", siteId).order("key"),
        ]);
        if (core.error) throw core.error;
        if (extra.error) throw extra.error;
        if (!isMounted) return;
        setPages([
          ...(core.data ?? []).map((p) => ({ key: p.key as string, status: p.status as string, extra: false })),
          ...(extra.data ?? []).map((p) => ({ key: p.key as string, status: p.status as string, extra: true })),
        ]);
      } catch (e) {
        if (isMounted) setErr(formatSupabaseError(e));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [siteId]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
        <div className="text-sm font-medium text-koi-ink">Your website</div>
        <div className="mt-1 text-sm text-koi-ink/60">
          Status: <span className="font-medium">{site.status}</span>
        </div>
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-koi-deep underline"
        >
          {liveUrl}
        </a>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
        <div className="text-sm font-medium text-koi-ink">Pages</div>
        {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
        <ul className="mt-2 divide-y divide-koi-ink/5">
          {pages.map((p) => (
            <li key={`${p.extra ? "x" : "p"}-${p.key}`} className="flex justify-between py-2 text-sm">
              <span className="text-koi-ink/80">{p.key}</span>
              <span className={p.status === "published" ? "text-green-700" : "text-koi-ink/55"}>
                {p.status}
              </span>
            </li>
          ))}
          {pages.length === 0 && !err ? (
            <li className="py-2 text-sm text-koi-ink/55">No pages yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
