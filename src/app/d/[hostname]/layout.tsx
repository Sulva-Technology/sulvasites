import type { ReactNode } from "react";

import SitePaused from "@/components/site/SitePaused";
import SulvaBadge from "@/components/site/SulvaBadge";
import { getSiteBillingState } from "@/lib/billing/siteState.server";
import { loadPublicSite } from "@/lib/publicSite.server";

// Billing gate for every public route on a custom domain. Pages still 404 on their own.
export default async function SiteHostLayout({ children, params }: { children: ReactNode; params: Promise<{ hostname: string }> }) {
  const { hostname } = await params;
  const ctx = await loadPublicSite("hostname", hostname);
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
