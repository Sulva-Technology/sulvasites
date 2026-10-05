"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cardCls, Notice } from "@/components/shop-admin/common";
import { categoryForTemplate } from "@/lib/stockPhotos";
import { kindDef, kindsForTemplate } from "@/lib/businessData/kinds";
import type { BusinessKind } from "@/lib/businessData/types";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { templateSupportsShop } from "@/templates/meta";
import { isMissingTable, useTemplateKey } from "./useTemplateKey";

type Counts = Partial<Record<BusinessKind, { total: number; active: number }>>;

/** Lists the managers a site's template offers, with item counts. basePath: /dashboard/<id>/business or /admin/sites/<id>/business. */
export default function BusinessIndex({ siteId, basePath, templateKey: provided }: { siteId: string; basePath: string; templateKey?: string }) {
  const { templateKey, failed } = useTemplateKey(siteId, provided);
  const [counts, setCounts] = useState<Counts>({});
  const [err, setErr] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getAuthenticatedClient();
        const { data, error } = await db.from("business_items").select("kind, active").eq("site_id", siteId).limit(1000);
        if (error) throw error;
        if (cancelled) return;
        const c: Counts = {};
        for (const r of (data ?? []) as Array<{ kind: BusinessKind; active: boolean }>) {
          const e = (c[r.kind] ??= { total: 0, active: 0 });
          e.total++;
          if (r.active) e.active++;
        }
        setCounts(c);
      } catch (e) {
        if (cancelled) return;
        if (isMissingTable(e)) setMissing(true);
        else setErr(e instanceof Error ? e.message : "Could not load your business data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  if (failed) return <Notice kind="error">Site not found, or you do not have access to it.</Notice>;
  if (!templateKey) return <div className="text-sm text-koi-ink/60">Loading…</div>;

  const kinds = kindsForTemplate(templateKey);
  const category = categoryForTemplate(templateKey);

  if (kinds.length === 0) {
    return (
      <div className={cardCls}>
        <div className="font-medium text-koi-ink">Nothing to manage here</div>
        <p className="mt-1 text-sm text-koi-ink/60">
          {templateSupportsShop(templateKey)
            ? "Your products, prices and orders are managed in the Shop tab."
            : "This website template has no business lists."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-koi-ink/60">
        Keep these lists up to date and your website shows them automatically. Changes go live as soon as you save.
      </p>
      {missing ? (
        <Notice kind="warn">Business lists are not switched on for this platform yet. Please contact Sulvatech.</Notice>
      ) : null}
      {err ? <Notice kind="error">{err}</Notice> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {kinds.map((k) => {
          const def = kindDef(k, category);
          const c = counts[k];
          return (
            <Link key={k} href={`${basePath}/${k}`} className={`${cardCls} block hover:border-gray-400`}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-medium text-koi-ink">{def.plural}</div>
                <div className="text-xs text-koi-ink/55">
                  {c ? `${c.total} item${c.total === 1 ? "" : "s"}${c.active !== c.total ? `, ${c.active} live` : ""}` : "Empty"}
                </div>
              </div>
              <p className="mt-1 text-sm text-koi-ink/60">{def.blurb}</p>
              <span className="mt-3 inline-block text-sm font-medium text-koi-deep">Manage {def.plural.toLowerCase()} →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
