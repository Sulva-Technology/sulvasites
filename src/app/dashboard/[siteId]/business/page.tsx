"use client";

import BusinessIndex from "@/components/business/BusinessIndex";
import { useSite } from "@/components/dashboard/SiteShell";

export default function DashboardBusinessPage() {
  const { siteId, site } = useSite();
  return <BusinessIndex siteId={siteId} basePath={`/dashboard/${siteId}/business`} templateKey={site.template_key} />;
}
