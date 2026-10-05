"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { useMember } from "@/components/RequireMember";
import { templateSupportsShop } from "@/templates/meta";
import { tabsForRole, type DashboardTab, type SiteRole } from "@/lib/siteAccess";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type SiteContextValue = {
  siteId: string;
  role: SiteRole | "admin";
  site: { id: string; slug: string; template_key: string; status: string };
  businessName: string;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside <SiteShell>.");
  return ctx;
}

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: "Overview",
  content: "Content",
  inbox: "Inbox",
  business: "Business",
  team: "Team",
  shop: "Shop",
};

function NotFound() {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Site not found, or you do not have access to it.{" "}
      <Link href="/dashboard" className="underline">
        Back to your sites
      </Link>
    </div>
  );
}

/** Tab layout for /dashboard/[siteId]; resolves the caller's role on that site. */
export default function SiteShell({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const siteId = String(params?.siteId ?? "");
  const { isAdmin, memberships } = useMember();

  const membership = memberships.find((m) => m.siteId === siteId) ?? null;
  const [adminSite, setAdminSite] = useState<SiteContextValue | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  const needsAdminLookup = isAdmin && !membership && Boolean(siteId);
  useEffect(() => {
    if (!needsAdminLookup) return;
    let isMounted = true;
    const supabase = supabaseBrowser();
    (async () => {
      const { data: site } = await supabase
        .from("sites")
        .select("id, slug, template_key, status")
        .eq("id", siteId)
        .maybeSingle();
      const { data: profile } = site
        ? await supabase
            .from("business_profiles")
            .select("business_name")
            .eq("site_id", siteId)
            .maybeSingle()
        : { data: null };
      if (!isMounted) return;
      if (site) {
        setAdminSite({
          siteId,
          role: "admin",
          site: site as SiteContextValue["site"],
          businessName: (profile?.business_name as string | undefined) || (site.slug as string),
        });
      }
      setAdminChecked(true);
    })();
    return () => {
      isMounted = false;
    };
  }, [needsAdminLookup, siteId]);

  let value: SiteContextValue | null = null;
  if (membership) {
    value = {
      siteId,
      role: membership.role,
      site: membership.site,
      businessName: membership.businessName,
    };
  } else if (needsAdminLookup) {
    if (!adminChecked) return <div className="text-sm text-gray-600">Loading…</div>;
    value = adminSite;
  }

  if (!value) return <NotFound />;

  const base = `/dashboard/${siteId}`;
  const tabs = tabsForRole(value.role, { shop: templateSupportsShop(value.site.template_key) });

  return (
    <SiteContext.Provider value={value}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{value.businessName}</h1>
          <p className="text-xs text-gray-500">
            {value.role === "admin" ? "Sulvatech admin" : value.role === "owner" ? "Owner" : "Staff"}
          </p>
        </div>
        <nav className="flex gap-1 border-b border-gray-200 text-sm">
          {tabs.map((tab) => {
            const href = tab === "overview" ? base : `${base}/${tab}`;
            const active = tab === "overview" ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={tab}
                href={href}
                className={`-mb-px border-b-2 px-3 py-2 ${
                  active
                    ? "border-black font-medium text-gray-900"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {TAB_LABELS[tab]}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </SiteContext.Provider>
  );
}
