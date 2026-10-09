"use client";

import RoleGate from "@/components/dashboard/RoleGate";
import BillingPanel from "@/components/dashboard/BillingPanel";
import { useSite } from "@/components/dashboard/SiteShell";

export default function SiteBillingPage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Billing />
    </RoleGate>
  );
}

function Billing() {
  const { siteId } = useSite();
  return <BillingPanel siteId={siteId} />;
}
