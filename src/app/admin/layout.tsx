"use client";

import type { ReactNode } from "react";

import LogoutButton from "@/components/LogoutButton";
import RequireAdmin from "@/components/RequireAdmin";
import { TourButton } from "@/components/tour/TourButton";
import { TourProvider } from "@/components/tour/TourProvider";
import { AppShell } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { adminTour } from "@/lib/tour/adminTour";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <TourProvider tour={adminTour}>
        <AppShell
          brand="Sulva Sites"
          brandHref="/admin/sites"
          bareRoutes="^/admin/sites/[^/]+/preview$"
          links={[
            { href: "/admin/sites", label: "Sites" },
            { href: "/admin/users", label: "Users", tourId: "nav-users" },
          ]}
          right={
            <>
              <TourButton />
              <span data-tour="new-site" className="inline-flex">
                <PillButton href="/admin/sites/new" variant="white" size="sm" arrow={false}>
                  New site
                </PillButton>
              </span>
              <LogoutButton variant="glass" />
            </>
          }
        >
          {children}
        </AppShell>
      </TourProvider>
    </RequireAdmin>
  );
}
