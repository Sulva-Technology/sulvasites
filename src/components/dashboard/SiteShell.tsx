"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { useMember } from "@/components/RequireMember";
import { kindsForTemplate } from "@/lib/businessData/kinds";
import { templateLabel, templateSupportsShop } from "@/templates/meta";
import { tabsForRole, type DashboardTab, type SiteRole } from "@/lib/siteAccess";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { INBOX_CHANGED_EVENT } from "@/components/inbox/InboxView";
import { Card } from "@/components/ui/Card";
import { useShellHero } from "@/components/ui/AppShell";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";

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
  insights: "Insights",
  team: "Team",
  shop: "Shop",
};

function NotFound() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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

  const [unread, setUnread] = useState(0);

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

  const hasAccess = Boolean(membership || adminSite);
  useEffect(() => {
    if (!hasAccess || !siteId) return;
    let isMounted = true;
    const refresh = async () => {
      const { count } = await supabaseBrowser()
        .from("inbox_messages")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId)
        .eq("status", "new")
        .eq("is_spam", false);
      if (isMounted) setUnread(count ?? 0);
    };
    void refresh();
    window.addEventListener(INBOX_CHANGED_EVENT, refresh);
    return () => {
      isMounted = false;
      window.removeEventListener(INBOX_CHANGED_EVENT, refresh);
    };
  }, [hasAccess, siteId, pathname]);

  let value: SiteContextValue | null = null;
  if (membership) {
    value = {
      siteId,
      role: membership.role,
      site: membership.site,
      businessName: membership.businessName,
    };
  } else if (needsAdminLookup) {
    if (!adminChecked) return <Card><p className="text-sm text-koi-ink/60">Loading…</p></Card>;
    value = adminSite;
  }

  if (!value) return <NotFound />;

  const base = `/dashboard/${siteId}`;
  const tabs = tabsForRole(value.role, {
    shop: templateSupportsShop(value.site.template_key),
    business: kindsForTemplate(value.site.template_key).length > 0,
  });
  const activeTab =
    tabs.find((tab) => tab !== "overview" && pathname.startsWith(`${base}/${tab}`)) ?? "overview";

  return (
    <SiteContext.Provider value={value}>
      <SiteHero value={value} />
      <div className="space-y-6">
        <Tabs
          label="Site sections"
          active={activeTab}
          items={tabs.map((tab) => ({
            id: tab,
            label: TAB_LABELS[tab],
            href: tab === "overview" ? base : `${base}/${tab}`,
            count: tab === "inbox" && unread > 0 ? Math.min(unread, 99) : undefined,
          }))}
        />
        {children}
      </div>
    </SiteContext.Provider>
  );
}

function SiteHero({ value }: { value: SiteContextValue }) {
  const published = value.site.status === "published";
  useShellHero(
    <PageHero
      status={
        <StatusPill tone={published ? "live" : "draft"} onDark>
          {published ? "Published" : "Draft"} ·{" "}
          {value.role === "admin" ? "Sulvatech admin" : value.role === "owner" ? "Owner" : "Staff"}
        </StatusPill>
      }
      title={value.businessName}
      accent={templateLabel(value.site.template_key)}
    />,
  );
  return null;
}
