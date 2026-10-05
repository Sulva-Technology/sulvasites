import { Suspense } from "react";
import type { ReactNode } from "react";

import AdminSiteChrome from "@/components/admin/site/AdminSiteChrome";

export default function AdminSiteLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminSiteChrome>{children}</AdminSiteChrome>
    </Suspense>
  );
}
