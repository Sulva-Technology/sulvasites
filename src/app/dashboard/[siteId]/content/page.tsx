"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ExtraPagesSection from "@/components/admin/site/ExtraPagesSection";
import RoleGate from "@/components/dashboard/RoleGate";
import { useSite } from "@/components/dashboard/SiteShell";
import type { ExtraPageRow } from "@/lib/extraPages";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

type CorePage = { key: "home" | "about" | "contact"; status: string };

const ORDER: Record<CorePage["key"], number> = { home: 0, about: 1, contact: 2 };

export default function DashboardContentPage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Content />
    </RoleGate>
  );
}

function Content() {
  const { siteId, site } = useSite();
  const base = `/dashboard/${siteId}/content`;
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site")
    .trim()
    .toLowerCase();

  const [pages, setPages] = useState<CorePage[]>([]);
  const [extraPages, setExtraPages] = useState<ExtraPageRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseBrowser();
    (async () => {
      try {
        const [core, extra] = await Promise.all([
          supabase.from("pages").select("key, status").eq("site_id", siteId),
          supabase
            .from("extra_pages")
            .select("id, site_id, key, status, data, updated_at, published_at")
            .eq("site_id", siteId)
            .order("updated_at", { ascending: false }),
        ]);
        if (core.error) throw core.error;
        if (extra.error) throw extra.error;
        if (!isMounted) return;
        setPages(
          ((core.data ?? []) as CorePage[]).sort((a, b) => (ORDER[a.key] ?? 9) - (ORDER[b.key] ?? 9)),
        );
        setExtraPages((extra.data ?? []) as unknown as ExtraPageRow[]);
      } catch (e) {
        if (isMounted) setErr(formatSupabaseError(e));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [siteId]);

  return (
    <div className="space-y-8">
      {err ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold">Pages</h2>
        <p className="mt-1 text-sm text-gray-600">Edit and publish the text and images on your site.</p>
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-200">
          {pages.map((p) => (
            <li key={p.key} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{p.key}</span>
              <span className="flex items-center gap-4">
                <span className={p.status === "published" ? "text-green-700" : "text-gray-500"}>{p.status}</span>
                <Link href={`${base}/pages/${p.key}`} className="font-medium underline underline-offset-2">
                  Edit
                </Link>
              </span>
            </li>
          ))}
          {pages.length === 0 && !err ? <li className="px-4 py-3 text-sm text-gray-500">No pages yet.</li> : null}
        </ul>
      </section>

      <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold">Business profile</h2>
        <p className="mt-1 text-sm text-gray-600">Name, contact details, socials and logo.</p>
        <Link
          href={`${base}/profile`}
          className="mt-3 inline-block text-sm font-medium underline underline-offset-2"
        >
          Edit business profile
        </Link>
      </section>

      <ExtraPagesSection
        siteId={siteId}
        siteSlug={site.slug}
        templateKey={site.template_key}
        platformDomain={platformDomain}
        extraPages={extraPages}
        setExtraPages={setExtraPages}
        editBasePath={`${base}/extra-pages`}
      />
    </div>
  );
}
