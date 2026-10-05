"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";

import { kindsForTemplate } from "@/lib/businessData/kinds";
import { useHostSite } from "@/components/HostSiteScope";
import { canAdminSite } from "@/lib/supabase/adminScope";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { templateLabel, templateSupportsShop } from "@/templates/meta";
import { useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";

type ChromeSite = { id: string; slug: string; template_key: string; status: string };

type AdminSiteContextValue = {
  /** Lets the overview page reflect publish/unpublish in the hero. */
  setStatus: (status: string) => void;
};

const AdminSiteContext = createContext<AdminSiteContextValue | null>(null);

export function useAdminSiteChrome(): AdminSiteContextValue | null {
  return useContext(AdminSiteContext);
}

function platformDomain() {
  return (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "soothecontrols.site").trim().toLowerCase();
}

/**
 * Hero + section tabs for /admin/sites/[siteId]/**. The full-screen preview
 * route renders bare (it has its own floating toolbar).
 */
export default function AdminSiteChrome({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const siteId = typeof params?.siteId === "string" ? params.siteId : "";
  const base = `/admin/sites/${siteId}`;
  const bare = pathname === `${base}/preview` || siteId === "new";

  const [site, setSite] = useState<ChromeSite | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  // Admins may open only sites they created (super admins: any). null while checking.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  // On a site's own address there is no sites list to go back to.
  const onPlatform = useHostSite().kind === "platform";

  useEffect(() => {
    if (!siteId || bare) return;
    let isMounted = true;
    (async () => {
      try {
        const supabase = await getAuthenticatedClient();
        const mayAdmin = await canAdminSite(supabase, siteId);
        if (!isMounted) return;
        setAllowed(mayAdmin);
        if (!mayAdmin) return;
        const [siteRes, profileRes, domainRes] = await Promise.all([
          supabase.from("sites").select("id, slug, template_key, status").eq("id", siteId).maybeSingle(),
          supabase.from("business_profiles").select("business_name").eq("site_id", siteId).maybeSingle(),
          supabase.from("domains").select("hostname, status").eq("site_id", siteId).eq("status", "active").limit(1),
        ]);
        if (!isMounted) return;
        if (siteRes.data) setSite(siteRes.data as ChromeSite);
        setBusinessName((profileRes.data?.business_name as string | undefined) || null);
        const active = (domainRes.data ?? [])[0] as { hostname?: string } | undefined;
        setDomain(active?.hostname ?? null);
      } catch {
        // Chrome is decorative; the page itself reports load errors. If the access check itself
        // failed, fail closed.
        if (isMounted) setAllowed((prev) => prev ?? false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [siteId, bare]);

  if (bare) return <>{children}</>;

  if (allowed === false) {
    return (
      <>
        <DeniedHero />
        <Card>
          <h2 className="text-base font-semibold tracking-tight text-koi-ink">You don&apos;t have access to this site</h2>
          <p className="mt-1 text-sm text-koi-ink/60">
            Admins can open only the sites they created. Ask a super admin if you need access.
          </p>
          {onPlatform ? (
            <div className="mt-4">
              <PillButton href="/admin/sites" variant="quiet">
                Back to your sites
              </PillButton>
            </div>
          ) : null}
        </Card>
      </>
    );
  }
  if (allowed === null) return <div className="text-sm text-koi-ink/60">Loading…</div>;

  const tk = site?.template_key ?? "";
  const tabs: Array<{ id: string; label: string; href: string }> = [
    { id: "overview", label: "Overview", href: base },
    { id: "pages", label: "Pages", href: `${base}/pages/home` },
  ];
  if (!site || kindsForTemplate(tk).length > 0) tabs.push({ id: "business", label: "Business", href: `${base}/business` });
  tabs.push({ id: "inbox", label: "Inbox", href: `${base}/inbox` });
  tabs.push({ id: "insights", label: "Insights", href: `${base}/insights` });
  if (site && templateSupportsShop(tk)) tabs.push({ id: "shop", label: "Shop", href: `${base}/shop` });
  tabs.push({ id: "settings", label: "Settings", href: `${base}?view=settings` });

  let active = "overview";
  if (pathname.startsWith(`${base}/pages/`) || pathname.startsWith(`${base}/extra-pages/`)) active = "pages";
  else if (pathname.startsWith(`${base}/business`)) active = "business";
  else if (pathname.startsWith(`${base}/inbox`)) active = "inbox";
  else if (pathname.startsWith(`${base}/insights`)) active = "insights";
  else if (pathname.startsWith(`${base}/shop`)) active = "shop";
  else if (search?.get("view") === "settings") active = "settings";

  return (
    <AdminSiteContext.Provider value={{ setStatus: (status) => setSite((p) => (p ? { ...p, status } : p)) }}>
      <ChromeHero site={site} businessName={businessName} domain={domain} base={base} />
      <div className="space-y-6">
        <Tabs label="Site sections" tourId="site-tabs" active={active} items={tabs} />
        {children}
      </div>
    </AdminSiteContext.Provider>
  );
}

function ChromeHero({
  site,
  businessName,
  domain,
  base,
}: {
  site: ChromeSite | null;
  businessName: string | null;
  domain: string | null;
  base: string;
}) {
  const published = site?.status === "published";
  const host = domain ?? (site ? `${site.slug}.${platformDomain()}` : "");
  useShellHero(
    <PageHero
      status={
        site ? (
          <StatusPill tone={published ? "live" : site.status === "draft" ? "draft" : "warn"} onDark>
            {published ? "Published" : site.status === "draft" ? "Draft" : site.status} · {host}
          </StatusPill>
        ) : (
          <StatusPill onDark>Loading site…</StatusPill>
        )
      }
      title={businessName || site?.slug || "Site"}
      accent={site ? templateLabel(site.template_key) : undefined}
      actions={
        <>
          <PillButton href={`${base}/pages/home`}>Open editor</PillButton>
          <PillButton href={`${base}/preview`} variant="glass">
            Preview
          </PillButton>
          {published && host ? (
            <PillButton href={`https://${host}`} variant="glass" target="_blank" rel="noreferrer">
              Visit site
            </PillButton>
          ) : null}
        </>
      }
    />,
  );
  return null;
}

function DeniedHero() {
  useShellHero(<PageHero title="No access" accent="This site belongs to another admin" />);
  return null;
}
