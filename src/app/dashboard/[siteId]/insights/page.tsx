"use client";

import RoleGate from "@/components/dashboard/RoleGate";
import { useSite } from "@/components/dashboard/SiteShell";
import InsightsView from "@/components/insights/InsightsView";

export default function DashboardInsightsPage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Insights />
    </RoleGate>
  );
}

function Insights() {
  const { siteId } = useSite();
  return <InsightsView siteId={siteId} />;
}
