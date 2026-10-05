import type { ReactNode } from "react";

import LogoutButton from "@/components/LogoutButton";
import RequireAdmin from "@/components/RequireAdmin";
import { AppShell } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AppShell
        brand="Sulva Sites"
        brandHref="/admin/sites"
        bareRoutes="^/admin/sites/[^/]+/preview$"
        links={[
          { href: "/admin/sites", label: "Sites" },
          { href: "/admin/users", label: "Users" },
        ]}
        right={
          <>
            <PillButton href="/admin/sites/new" variant="white" size="sm" arrow={false}>
              New site
            </PillButton>
            <LogoutButton variant="glass" />
          </>
        }
      >
        {children}
      </AppShell>
    </RequireAdmin>
  );
}
