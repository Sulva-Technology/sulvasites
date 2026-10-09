"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, Notice } from "@/components/shop-admin/common";
import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";

type Row = {
  id: string;
  host: string;
  kind: "platform" | "subdomain" | "custom";
  google_state: "pending" | "token" | "verified" | "added" | "submitted";
  sitemap_submitted_at: string | null;
  indexnow_pushed_at: string | null;
  failures: number;
  last_error: string | null;
  last_error_at: string | null;
  active: boolean;
};

type Payload = { google: boolean; indexNow: boolean; rows: Row[] };

const GOOGLE_LABEL: Record<Row["google_state"], { label: string; tone: StatusTone }> = {
  pending: { label: "Waiting to verify", tone: "draft" },
  token: { label: "Verifying", tone: "draft" },
  verified: { label: "Verified", tone: "draft" },
  added: { label: "Sitemap pending", tone: "draft" },
  submitted: { label: "Sitemap submitted", tone: "live" },
};

function when(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Admin-only: Google Search Console / IndexNow submission state for this site, with a Resubmit button. */
export default function SearchEnginesSection({ siteId, published }: { siteId: string; published: boolean }) {
  const api = `/api/admin/sites/${encodeURIComponent(siteId)}/search`;
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<Payload>(api);
    if (!res.ok) setError(res.data.error || "Could not load search status.");
    else setData(res.data);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resubmit() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await apiFetch<Payload>(api, { method: "POST" });
      if (!res.ok) throw new Error(res.data.error || "Resubmit failed.");
      setData(res.data);
      setOk("Submitted. Google can take a few days to crawl a new site.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = (data?.rows ?? []).filter((r) => r.active);
  const configured = !!data && (data.google || data.indexNow);

  return (
    <Card>
      <CardHeader
        title="Search engines"
        description="Submitted to Google Search Console and IndexNow (Bing) automatically every day and on publish."
        action={
          <PillButton variant="quiet" size="sm" onClick={resubmit} loading={busy} disabled={!published || !configured}>
            Resubmit now
          </PillButton>
        }
      />
      <div className="space-y-3">
        {error ? <Notice kind="error">{error}</Notice> : null}
        {ok ? <Notice kind="ok">{ok}</Notice> : null}
        {data && !configured ? (
          <Notice kind="warn">Not configured: set GOOGLE_SEARCH_SA_JSON, GOOGLE_SEARCH_DOMAIN_PROPERTY and INDEXNOW_KEY (see README).</Notice>
        ) : null}
        {data && configured && !data.google ? <Notice kind="info">Google is not configured; only IndexNow runs.</Notice> : null}
        {data && configured && !data.indexNow ? <Notice kind="info">IndexNow is not configured; only Google runs.</Notice> : null}
        {!published ? <Notice kind="info">Publish the site to submit it.</Notice> : null}
        {data && published && rows.length === 0 ? (
          <p className="text-sm text-koi-ink/60">Not submitted yet. The daily run picks it up, or press Resubmit now.</p>
        ) : null}
        {rows.length > 0 ? (
          <ul className="divide-y divide-koi-ink/5">
            {rows.map((r) => {
              const g = GOOGLE_LABEL[r.google_state];
              return (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-all">{r.host}</span>
                    <StatusPill tone={r.failures >= 5 ? "warn" : g.tone}>{r.failures >= 5 ? "Stopped: resubmit" : g.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-koi-ink/60">
                    Sitemap to Google: {when(r.sitemap_submitted_at)} · IndexNow: {when(r.indexnow_pushed_at)}
                  </p>
                  {r.last_error ? (
                    <p className="mt-1 text-xs text-red-700 break-words">
                      {r.last_error} ({when(r.last_error_at)})
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
