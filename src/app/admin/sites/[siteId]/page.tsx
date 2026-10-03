"use client";

import Link from "next/link";
import { templateLabel } from "@/templates/meta";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { publishSite, unpublishSite } from "@/lib/publishing";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import AiSiteContentGenerator from "@/components/admin/AiSiteContentGenerator";
import DomainsSection, { type DomainRow } from "@/components/admin/site/DomainsSection";
import ExtraPagesSection from "@/components/admin/site/ExtraPagesSection";
import LogoSection, { type AssetRow } from "@/components/admin/site/LogoSection";
import type { ExtraPageRow } from "@/lib/extraPages";

type SiteRow = {
  id: string;
  slug: string;
  template_key: string;
  status: string;
};

type ProfileRow = {
  site_id: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  socials: Record<string, unknown> | null;
  logo_asset_id: string | null;
};

type PageRow = {
  id: string;
  key: "home" | "about" | "contact";
  status: string;
};

type SocialInputs = {
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
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

  const [site, setSite] = useState<SiteRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [extraPages, setExtraPages] = useState<ExtraPageRow[]>([]);
  const [logoAsset, setLogoAsset] = useState<AssetRow | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    tagline: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    whatsapp: "",
  });

  const [socials, setSocials] = useState<SocialInputs>({
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
  });

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
      setLogoLoadError(null);

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

      const [siteRes, profileRes, pagesRes, domainsRes, extraPagesRes] = await Promise.all([
        authenticatedSupabase
          .from("sites")
          .select("id, slug, template_key, status")
          .eq("id", siteId)
          .single(),
        authenticatedSupabase
          .from("business_profiles")
          .select(
            "site_id, business_name, tagline, description, address, phone, email, whatsapp, socials, logo_asset_id",
          )
          .eq("site_id", siteId)
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

      // Check for critical errors (sites, profiles, pages, domains)
      const criticalErr =
        siteRes.error ||
        profileRes.error ||
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
      const loadedProfile = profileRes.data as ProfileRow;
      const loadedPages = (pagesRes.data ?? []) as PageRow[];
      const loadedDomains = (domainsRes.data ?? []) as DomainRow[];

      setSite(loadedSite);
      setProfile(loadedProfile);
      setPages(loadedPages);
      setDomains(loadedDomains);
      setExtraPages(loadedExtraPages);

      setForm({
        business_name: loadedProfile.business_name ?? "",
        tagline: loadedProfile.tagline ?? "",
        description: loadedProfile.description ?? "",
        address: loadedProfile.address ?? "",
        phone: loadedProfile.phone ?? "",
        email: loadedProfile.email ?? "",
        whatsapp: loadedProfile.whatsapp ?? "",
      });

      const s = (loadedProfile.socials ?? {}) as Record<string, unknown>;
      setSocials({
        instagram: typeof s.instagram === "string" ? s.instagram : "",
        facebook: typeof s.facebook === "string" ? s.facebook : "",
        twitter: typeof s.twitter === "string" ? s.twitter : "",
        tiktok: typeof s.tiktok === "string" ? s.tiktok : "",
      });

      if (loadedProfile.logo_asset_id) {
        const { data: asset, error: assetError } = await authenticatedSupabase
          .from("assets")
          .select("id, path, mime_type, size_bytes, created_at")
          .eq("id", loadedProfile.logo_asset_id)
          .single();

        if (!isMounted) return;

        if (assetError) {
          setLogoLoadError(formatSupabaseError(assetError));
          setLogoAsset(null);
        } else {
          setLogoAsset(asset as AssetRow);
        }
      } else {
        setLogoAsset(null);
      }
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
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Invalid site ID. Please go back to the sites list.
      </div>
    );
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSaveSuccess(false);
    setSaveError(null);
    setIsSaving(true);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();
      const payload = {
        business_name: form.business_name.trim(),
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        // Keep extra keys templates store in socials (hours, nav_labels, footer_labels…).
        socials: {
          ...((profile?.socials ?? {}) as Record<string, unknown>),
          instagram: socials.instagram.trim() || null,
          facebook: socials.facebook.trim() || null,
          twitter: socials.twitter.trim() || null,
          tiktok: socials.tiktok.trim() || null,
        },
      };

      const { error } = await supabase
        .from("business_profiles")
        .update(payload)
        .eq("site_id", siteId);

      if (error) {
        setSaveError(formatSupabaseError(error));
        return;
      }

      setProfile((prev) => (prev ? { ...prev, socials: payload.socials } : prev));
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
      setPublishSuccess("Site unpublished.");
    } catch (err) {
      setPublishError(formatSupabaseError(err));
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!site || !profile) {
    return (
      <div className="text-sm text-gray-700">
        Site not found (or you don&apos;t have access).
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* A) Site Summary */}
      <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Site overview</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage profile and page content for this site.
            </p>
          </div>
          <Link
            href="/admin/sites"
            className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Back to sites
          </Link>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-600">Slug</dt>
            <dd className="mt-1 font-mono text-sm">{site.slug}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-600">Preview URL</dt>
            <dd className="mt-1 font-mono text-sm">
              https://{site.slug}.{platformDomain}
            </dd>
            <dd className="mt-1 text-xs text-gray-500">
              Local dev uses path-based routing: <span className="font-mono">http://localhost:3000/{site.slug}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-600">Admin Preview</dt>
            <dd className="mt-1">
              <Link
                href={`/admin/sites/${siteId}/preview`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                View Preview
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-600">Custom domain</dt>
            <dd className="mt-1 font-mono text-sm">
              {activeDomain ? `https://${activeDomain.hostname}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-600">Template</dt>
            <dd className="mt-1 text-sm text-gray-900">{templateLabel(site.template_key)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-600">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{site.status}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {site.status === "published" ? (
            <button
              type="button"
              onClick={onUnpublishSite}
              disabled={isPublishing}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
            >
              {isPublishing ? "Working…" : "Unpublish Site"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPublishSite}
              disabled={isPublishing}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPublishing ? "Publishing…" : "Publish Site"}
            </button>
          )}
        </div>

        {publishError ? (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {publishError}
          </div>
        ) : null}
        {publishSuccess ? (
          <div className="mt-3 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {publishSuccess}
          </div>
        ) : null}
      </section>

      {/* A2) Domains */}
      <DomainsSection
        siteId={siteId}
        siteSlug={site.slug}
        platformDomain={platformDomain}
        domains={domains}
        setDomains={setDomains}
      />

      {/* A3) Logo */}
      <LogoSection
        siteId={siteId}
        logoAsset={logoAsset}
        loadError={logoLoadError}
        onLogoChange={(asset) => {
          setLogoAsset(asset);
          setProfile((prev) => (prev ? { ...prev, logo_asset_id: asset?.id ?? null } : prev));
        }}
      />

      {/* B) Business Profile Editor */}
      <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold">Business profile</h2>
        <p className="mt-1 text-sm text-gray-600">
          These fields power the public website template.
        </p>

        <form onSubmit={onSaveProfile} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Business name
              </span>
              <input
                value={form.business_name}
                onChange={(e) =>
                  setForm((v) => ({ ...v, business_name: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">Tagline</span>
              <input
                value={form.tagline}
                onChange={(e) =>
                  setForm((v) => ({ ...v, tagline: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((v) => ({ ...v, description: e.target.value }))
              }
              rows={5}
              className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-800">Address</span>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm((v) => ({ ...v, address: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">Phone</span>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((v) => ({ ...v, phone: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">Email</span>
              <input
                value={form.email}
                onChange={(e) =>
                  setForm((v) => ({ ...v, email: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-800">WhatsApp</span>
              <input
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((v) => ({ ...v, whatsapp: e.target.value }))
                }
                className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-semibold text-gray-900">Socials</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-800">
                  Instagram
                </span>
                <input
                  value={socials.instagram}
                  onChange={(e) =>
                    setSocials((v) => ({ ...v, instagram: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  placeholder="https://instagram.com/..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">
                  Facebook
                </span>
                <input
                  value={socials.facebook}
                  onChange={(e) =>
                    setSocials((v) => ({ ...v, facebook: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  placeholder="https://facebook.com/..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">Twitter</span>
                <input
                  value={socials.twitter}
                  onChange={(e) =>
                    setSocials((v) => ({ ...v, twitter: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  placeholder="https://x.com/..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-800">TikTok</span>
                <input
                  value={socials.tiktok}
                  onChange={(e) =>
                    setSocials((v) => ({ ...v, tiktok: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  placeholder="https://tiktok.com/@..."
                />
              </label>
            </div>
          </div>

          {saveError ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}
          {saveSuccess ? (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Saved.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      {/* B2) AI content generator (optional) */}
      <AiSiteContentGenerator siteId={siteId} />

      {/* B4) Extra pages (per site) */}
      <ExtraPagesSection
        siteId={siteId}
        siteSlug={site.slug}
        templateKey={site.template_key}
        platformDomain={platformDomain}
        extraPages={extraPages}
        setExtraPages={setExtraPages}
      />

      {/* C) Pages quick links */}
      <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
        <h2 className="text-lg font-semibold">Pages</h2>
        <p className="mt-1 text-sm text-gray-600">
          Jump into Home/About/Contact editing.
        </p>

        {/* Warning if pages aren't published */}
        {site.status === "published" && sortedPages.some((p) => p.status !== "published") ? (
          <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <strong>⚠️ Warning:</strong> Your site is published, but some pages are still in draft. 
            The site won&apos;t be accessible until all pages (home, about, contact) are published. 
            Click &quot;Publish Site&quot; again to publish all pages, or publish each page individually.
          </div>
        ) : null}

        {sortedPages.length < 3 ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>⚠️ Error:</strong> Missing pages! Expected 3 pages (home, about, contact), but found {sortedPages.length}. 
            The database trigger may not have run. Please check your database or contact support.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-gray-200">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {sortedPages.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={3}>
                    No pages found (the DB trigger may not have run).
                  </td>
                </tr>
              ) : (
                sortedPages.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.key}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "published" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/sites/${siteId}/pages/${p.key}`}
                        className="text-sm font-medium text-black underline underline-offset-2"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

