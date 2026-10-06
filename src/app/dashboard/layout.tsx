import type { ReactNode } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import HostSiteScope from "@/components/HostSiteScope";
import RequireMember from "@/components/RequireMember";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireMember>
      <HostSiteScope>
        <DashboardShell>{children}</DashboardShell>
      </HostSiteScope>
    </RequireMember>
  );
}
