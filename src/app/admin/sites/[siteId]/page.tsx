"use client";

import Link from "next/link";
import { templateLabel } from "@/templates/meta";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { publishSite, unpublishSite } from "@/lib/publishing";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import AiSeoAllPages from "@/components/admin/AiSeoAllPages";
import AiSiteContentGenerator from "@/components/admin/AiSiteContentGenerator";
import DomainsSection, { type DomainRow } from "@/components/admin/site/DomainsSection";
import ExtraPagesSection from "@/components/admin/site/ExtraPagesSection";
import ShopAdminLink from "@/components/admin/site/ShopAdminLink";
import ProfileEditor from "@/components/site-editor/ProfileEditor";
import TeamManager from "@/components/team/TeamManager";
import type { ExtraPageRow } from "@/lib/extraPages";
import { useAdminSiteChrome } from "@/components/admin/site/AdminSiteChrome";
import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";

type SiteRow = {
  id: string;
  slug: string;
  template_key: string;
  status: string;
};

type PageRow = {
  id: string;
  key: "home" | "about" | "contact";
  status: string;
};

const pageOrder: Record<PageRow["key"], number> = {
  home: 0,
  about: 1,
  contact: 2,
};

export default function SiteOverviewPage({
  params,
}: {
  params?: { siteId: string } | Promise<{ siteId: string }>;
}) {
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site")
    .trim()
    .toLowerCase();

  // Use useParams() hook as primary source (more reliable in client components)
  const routeParams = useParams();
  const siteId = (routeParams?.siteId as string) || 
    (params && typeof params === "object" && "siteId" in params && !("then" in params)
      ? (params as { siteId: string }).siteId
      : null) || null;

  const view = useSearchParams()?.get("view") === "settings" ? "settings" : "overview";
  const chrome = useAdminSiteChrome();

  const [site, setSite] = useState<SiteRow | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [extraPages, setExtraPages] = useState<ExtraPageRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) {
      setLoadError("Invalid site ID");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      let authenticatedSupabase;
      try {
        // Ensure client is fully authenticated before making database calls
        authenticatedSupabase = await getAuthenticatedClient();
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setLoadError(err instanceof Error ? err.message : "Session error. Please log in again.");
        return;
      }

      const [siteRes, pagesRes, domainsRes, extraPagesRes] = await Promise.all([
        authenticatedSupabase
          .from("sites")
          .select("id, slug, template_key, status")
          .eq("id", siteId)
          .single(),
        authenticatedSupabase
          .from("pages")
          .select("id, key, status")
          .eq("site_id", siteId),
        authenticatedSupabase
          .from("domains")
          .select("id, hostname, status, created_at")
          .eq("site_id", siteId)
          .order("created_at", { ascending: false }),
        authenticatedSupabase
          .from("extra_pages")
          .select("id, site_id, key, status, data, updated_at, published_at")
          .eq("site_id", siteId)
          .order("updated_at", { ascending: false }),
      ]);

      if (!isMounted) return;
      setIsLoading(false);

      // Check for critical errors (sites, pages, domains)
      const criticalErr =
        siteRes.error ||
        pagesRes.error ||
        domainsRes.error;
      if (criticalErr) {
        setLoadError(formatSupabaseError(criticalErr));
        return;
      }

      // extra_pages table might not exist yet - handle gracefully
      let loadedExtraPages: ExtraPageRow[] = [];
      if (extraPagesRes.error) {
        // If table doesn't exist, just log and continue with empty array
        const errorMsg = (extraPagesRes.error as { message?: string })?.message || "";
        const errorCode = (extraPagesRes.error as { code?: string })?.code || "";
        const isTableMissing = 
          errorMsg.includes("does not exist") || 
          errorMsg.includes("schema cache") ||
          errorMsg.includes("Could not find the table") ||
          errorCode === "42P01"; // PostgreSQL "undefined_table" error code
        
        if (!isTableMissing) {
          // Only show error if it's not a "table doesn't exist" error
          console.warn("Could not load extra pages:", extraPagesRes.error);
        }
      } else {
        loadedExtraPages = (extraPagesRes.data ?? []) as unknown as ExtraPageRow[];
      }

      const loadedSite = siteRes.data as SiteRow;
      const loadedPages = (pagesRes.data ?? []) as PageRow[];
      const loadedDomains = (domainsRes.data ?? []) as DomainRow[];

      setSite(loadedSite);
      setPages(loadedPages);
      setDomains(loadedDomains);
      setExtraPages(loadedExtraPages);

    }

    load();

    return () => {
      isMounted = false;
    };
  }, [siteId]);

  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => pageOrder[a.key] - pageOrder[b.key]);
  }, [pages]);

  const activeDomain = useMemo(() => {
    return domains.find((d) => d.status === "active") ?? null;
  }, [domains]);

  if (!siteId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Invalid site ID. Please go back to the sites list.
      </div>
    );
  }

  async function onPublishSite() {
    if (!siteId) return;
    if (!window.confirm("Publish this site and all 3 pages?")) return;

    setPublishSuccess(null);
    setPublishError(null);
    setIsPublishing(true);

    try {
      // publishSite already ensures authentication
      const res = await publishSite(siteId);
      setSite((prev) => (prev ? { ...prev, status: res.site.status } : prev));
      setPages((prev) =>
        prev.map((p) => {
          const updated = res.pages.find((x) => x.id === p.id);
          return updated ? { ...p, status: updated.status } : p;
        }),
      );
      chrome?.setStatus(res.site.status);
      setPublishSuccess("Site published.");
    } catch (err) {
      setPublishError(formatSupabaseError(err));
    } finally {
      setIsPublishing(false);
    }
  }

  async function onUnpublishSite() {
    if (!siteId) return;
    if (!window.confirm("Unpublish this site and set all pages back to draft?")) return;

    setPublishSuccess(null);
    setPublishError(null);
    setIsPublishing(true);

    try {
      // unpublishSite already ensures authentication
      const res = await unpublishSite(siteId);
      setSite((prev) => (prev ? { ...prev, status: res.site.status } : prev));
      setPages((prev) =>
        prev.map((p) => {
          const updated = res.pages.find((x) => x.id === p.id);
          return updated ? { ...p, status: updated.status } : p;
        }),
      );
      chrome?.setStatus(res.site.status);
      setPublishSuccess("Site unpublished.");
    } catch (err) {
      setPublishError(formatSupabaseError(err));
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-koi-ink/60">Loading…</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!site) {
    return (
      <Card>
        <p className="text-sm text-koi-ink/75">Site not found (or you don&apos;t have access).</p>
      </Card>
    );
  }

  const publishCard = (
    <Card>
      <CardHeader
        title="Publishing"
        description="Manage profile and page content for this site."
        action={
          site.status === "published" ? (
            <PillButton variant="quiet" onClick={onUnpublishSite} loading={isPublishing}>
              {isPublishing ? "Working…" : "Unpublish site"}
            </PillButton>
          ) : (
            <PillButton onClick={onPublishSite} loading={isPublishing}>
              {isPublishing ? "Publishing…" : "Publish site"}
            </PillButton>
          )
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Slug</dt>
          <dd className="mt-1 break-all font-mono text-sm">{site.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Preview URL</dt>
          <dd className="mt-1 break-all font-mono text-sm">
            https://{site.slug}.{platformDomain}
          </dd>
          <dd className="mt-1 text-xs text-koi-ink/55">
            Local dev uses path-based routing: <span className="font-mono">http://localhost:3000/{site.slug}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Admin preview</dt>
          <dd className="mt-1">
            <Link
              href={`/admin/sites/${siteId}/preview`}
              className="text-sm font-medium text-koi-deep underline underline-offset-2 hover:text-koi-sea"
            >
              View preview
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Custom domain</dt>
          <dd className="mt-1 break-all font-mono text-sm">
            {activeDomain ? `https://${activeDomain.hostname}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Template</dt>
          <dd className="mt-1 text-sm">{templateLabel(site.template_key)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-koi-ink/60">Status</dt>
          <dd className="mt-1">
            <StatusPill tone={site.status === "published" ? "live" : site.status === "draft" ? "draft" : "warn"}>
              {site.status}
            </StatusPill>
          </dd>
        </div>
      </dl>

      {publishError ? (
        <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {publishError}
        </div>
      ) : null}
      {publishSuccess ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {publishSuccess}
        </div>
      ) : null}
    </Card>
  );

  if (view === "settings") {
    return (
      <div className="space-y-6">
        {publishCard}

        {/* A3) Logo + B) Business Profile Editor */}
        <ProfileEditor siteId={siteId} mode="admin" basePath={`/admin/sites/${siteId}`} />

        {/* B2) AI content generator (optional) */}
        <div data-tour="ai-content">
          <AiSiteContentGenerator siteId={siteId} templateKey={site.template_key} />
        </div>

        <div data-tour="ai-seo-all">
          <AiSeoAllPages siteId={siteId} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {publishCard}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* C) Pages quick links */}
        <Card>
          <CardHeader
            title="Pages"
            description="Jump into Home/About/Contact editing."
            action={<ShopAdminLink siteId={siteId} templateKey={site.template_key} />}
          />

          {/* Warning if pages aren't published */}
          {site.status === "published" && sortedPages.some((p) => p.status !== "published") ? (
            <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Your site is published, but some pages are still in draft.
              The site won&apos;t be accessible until all pages (home, about, contact) are published.
              Click &quot;Publish Site&quot; again to publish all pages, or publish each page individually.
            </div>
          ) : null}

          {sortedPages.length < 3 ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>⚠️ Error:</strong> Missing pages! Expected 3 pages (home, about, contact), but found {sortedPages.length}.
              The database trigger may not have run. Please check your database or contact support.
            </div>
          ) : null}

          {sortedPages.length === 0 ? (
            <p className="text-sm text-koi-ink/60">No pages found (the DB trigger may not have run).</p>
          ) : (
            <ul className="space-y-2">
              {sortedPages.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-koi-paper px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize">{p.key}</span>
                    <StatusPill tone={p.status === "published" ? "live" : "draft"}>{p.status}</StatusPill>
                  </div>
                  <PillButton href={`/admin/sites/${siteId}/pages/${p.key}`} variant="quiet" size="sm">
                    Edit
                  </PillButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* A2) Domains */}
        <DomainsSection
          siteId={siteId}
          siteSlug={site.slug}
          platformDomain={platformDomain}
          domains={domains}
          setDomains={setDomains}
        />

        {/* B4) Extra pages (per site) */}
        <ExtraPagesSection
          siteId={siteId}
          siteSlug={site.slug}
          templateKey={site.template_key}
          platformDomain={platformDomain}
          extraPages={extraPages}
          setExtraPages={setExtraPages}
        />

        {/* A2b) Team */}
        <Card>
          <CardHeader
            title="Team"
            description="Owners can edit content and manage staff; staff can view orders, inbox and business details."
          />
          <TeamManager siteId={siteId} actor="admin" />
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Logo, profile, AI content &amp; SEO</h2>
          <p className="mt-1 text-sm text-koi-ink/60">Business profile, logo upload and AI tools live under Settings.</p>
        </div>
        <PillButton href={`/admin/sites/${siteId}?view=settings`} variant="quiet">
          Open settings
        </PillButton>
      </Card>
    </div>
  );
}
