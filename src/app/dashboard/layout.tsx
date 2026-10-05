import type { ReactNode } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import RequireMember from "@/components/RequireMember";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireMember>
      <DashboardShell>{children}</DashboardShell>
    </RequireMember>
  );
}
