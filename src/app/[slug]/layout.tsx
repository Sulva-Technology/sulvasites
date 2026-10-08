import type { ReactNode } from "react";

import SitePaused from "@/components/site/SitePaused";
import SulvaBadge from "@/components/site/SulvaBadge";
import { getSiteBillingState } from "@/lib/billing/siteState.server";
import { loadPublicSite } from "@/lib/publicSite.server";

// Billing gate for every public route under /<slug> (pages, blog, shop). Pages still 404 on their own.
export default async function SiteSlugLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadPublicSite("slug", slug);
  if (!ctx) return children;
  const state = await getSiteBillingState(ctx.siteData.site.id);
  if (!state.live) return <SitePaused name={ctx.siteData.profile.business_name} />;
  return (
    <>
      {children}
      {state.badge ? <SulvaBadge /> : null}
    </>
  );
}
