"use client";

import { templateLabel } from "@/templates/meta";
import { useEffect, useMemo, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import type { StatusTone } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { TourContextSync } from "@/components/tour/TourProvider";

type SiteRow = {
  id: string;
  slug: string;
  template_key: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  business_name?: string | null;
};

type ProfileJoin = { business_name: string | null };
type SiteQueryRow = Omit<SiteRow, "business_name"> & {
  business_profiles?: ProfileJoin | ProfileJoin[] | null;
};

type StatusFilter = "all" | "live" | "draft";

function statusTone(status: string): StatusTone {
  if (status === "published") return "live";
  if (status === "draft") return "draft";
  return "warn";
}

function statusLabel(status: string): string {
  if (status === "published") return "Live";
  if (status === "draft") return "Draft";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function KoiIcon() {
  return (
    <svg viewBox="0 0 64 32" className="h-10 w-20 text-koi-orange" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16c-6-7-9-8-10-10 4 2 7 6 11 8M12 16c-6 7-9 8-10 10 4-2 7-6 11-8" />
      <path d="M12 16c6-9 30-11 42-2 2 1.5 2 2.5 0 4-12 9-36 7-42-2Z" />
      <path d="M30 8c3-4 8-4 10 0" />
      <circle cx="50" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      let authenticatedSupabase;
      try {
        // Ensure client is fully authenticated before making database call
        authenticatedSupabase = await getAuthenticatedClient();
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setError(err instanceof Error ? err.message : "Session error. Please log in again.");
        return;
      }

      // Same list query as before, with the business name embedded (1:1 FK).
      const withName = await authenticatedSupabase
        .from("sites")
        .select("id, slug, template_key, status, created_at, updated_at, business_profiles(business_name)")
        .order("created_at", { ascending: false });

      // Fall back to the plain list if the embed is unavailable.
      const result = withName.error
        ? await authenticatedSupabase
            .from("sites")
            .select("id, slug, template_key, status, created_at")
            .order("created_at", { ascending: false })
        : withName;

      if (!isMounted) return;

      setIsLoading(false);

      if (result.error) {
        setError(formatSupabaseError(result.error));
        return;
      }

      setSites(
        ((result.data ?? []) as unknown as SiteQueryRow[]).map(({ business_profiles, ...row }) => {
          const profile = Array.isArray(business_profiles) ? business_profiles[0] : business_profiles;
          return { ...row, business_name: profile?.business_name ?? null };
        }),
      );
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: sites.length,
      live: sites.filter((s) => s.status === "published").length,
      draft: sites.filter((s) => s.status === "draft").length,
    }),
    [sites],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (filter === "live" && s.status !== "published") return false;
      if (filter === "draft" && s.status !== "draft") return false;
      if (!q) return true;
      return s.slug.toLowerCase().includes(q) || (s.business_name ?? "").toLowerCase().includes(q);
    });
  }, [sites, search, filter]);

  useShellHero(
    <PageHero
      status={
        <StatusPill tone="live" onDark>
          {isLoading ? "Loading sites…" : `${counts.live} live · ${counts.draft} ${counts.draft === 1 ? "draft" : "drafts"}`}
        </StatusPill>
      }
      title="Your sites"
      accent="worth obsessing over"
      actions={
        <>
          <PillButton href="/admin/sites/new">New site</PillButton>
          <PillButton href="/admin/users" variant="glass">
            Users
          </PillButton>
        </>
      }
    />,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          label="Filter sites by status"
          active={filter}
          onChange={(id) => setFilter(id as StatusFilter)}
          items={[
            { id: "all", label: "All", count: counts.all },
            { id: "live", label: "Live", count: counts.live },
            { id: "draft", label: "Drafts", count: counts.draft },
          ]}
        />
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search sites</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className={`${inputClass} rounded-full`}
          />
        </label>
      </div>

      <TourContextSync firstSiteId={sites[0]?.id} />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <p className="text-sm text-koi-ink/60">Loading…</p>
        </Card>
      ) : sites.length === 0 && !error ? (
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <KoiIcon />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">No sites yet</h2>
            <p className="mt-1 text-sm text-koi-ink/60">Start with a business and we&apos;ll build the rest.</p>
          </div>
          <PillButton href="/admin/sites/new">Create your first site</PillButton>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-koi-ink/60">No sites match this filter.</p>
        </Card>
      ) : (
        <ul data-tour="sites-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card as="div" className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold tracking-tight">{s.business_name || s.slug}</h2>
                    <p className="mt-0.5 truncate font-mono text-xs text-koi-ink/50">/{s.slug}</p>
                  </div>
                  <StatusPill tone={statusTone(s.status)}>{statusLabel(s.status)}</StatusPill>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-block max-w-full truncate rounded-full bg-koi-sea/10 px-2.5 py-0.5 text-xs font-medium text-koi-deep">
                      {templateLabel(s.template_key)}
                    </span>
                    <p className="text-xs text-koi-ink/50">
                      Updated {new Date(s.updated_at ?? s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <PillButton
                    href={`/admin/sites/${s.id}`}
                    variant="quiet"
                    size="sm"
                    aria-label={`Open ${s.business_name || s.slug}`}
                  >
                    Open
                  </PillButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
