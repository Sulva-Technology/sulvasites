"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";

/** The site's template key: `provided` when the caller already knows it (dashboard), else fetched (admin). */
export function useTemplateKey(siteId: string, provided?: string): { templateKey: string | null; failed: boolean } {
  const [fetched, setFetched] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (provided) return;
    let cancelled = false;
    supabaseBrowser()
      .from("sites")
      .select("template_key")
      .eq("id", siteId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setFailed(true);
        else setFetched((data as { template_key: string }).template_key);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, provided]);
  return { templateKey: provided ?? fetched, failed };
}

/** True when a PostgREST error means migration 009 has not been applied yet. */
export function isMissingTable(e: unknown): boolean {
  const x = e as { code?: string; message?: string } | null;
  return !!x && (x.code === "42P01" || x.code === "PGRST205" || /business_items/.test(x.message ?? "") && /does not exist|schema cache/i.test(x.message ?? ""));
}
