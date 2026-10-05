import type { ReactNode } from "react";

import SiteShell from "@/components/dashboard/SiteShell";

export default function SiteDashboardLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
