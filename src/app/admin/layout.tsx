"use client";

import type { ReactNode } from "react";

import HostSiteScope, { useHostSite } from "@/components/HostSiteScope";
import LogoutButton from "@/components/LogoutButton";
import RequireAdmin from "@/components/RequireAdmin";
import { AdminTourContext } from "@/components/tour/AdminTourContext";
import { TourButton } from "@/components/tour/TourButton";
import { TourContextSync, TourProvider } from "@/components/tour/TourProvider";
import { AppShell } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { adminTour } from "@/lib/tour/adminTour";
import { useIsSuperAdmin } from "@/components/admin/useIsSuperAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <HostSiteScope>
        <AdminChrome>{children}</AdminChrome>
      </HostSiteScope>
    </RequireAdmin>
  );
}

/** Inside RequireAdmin so the super-admin check runs only for signed-in admins. */
function AdminChrome({ children }: { children: ReactNode }) {
  const isSuper = useIsSuperAdmin();
  const hostSite = useHostSite();
  if (hostSite.kind === "site") return <SiteAdminChrome siteId={hostSite.siteId}>{children}</SiteAdminChrome>;
  return (
    <TourProvider tour={adminTour}>
      <AdminTourContext />
      <AppShell
        brand="Sulva Sites"
        brandHref="/admin/sites"
        bareRoutes="^/admin/(sites/[^/]+/preview|templates/[^/]+(/.*)?)$"
        links={[
          { href: "/admin/sites", label: "Sites" },
          { href: "/admin/templates", label: "Templates" },
          ...(isSuper ? [{ href: "/admin/users", label: "Users", tourId: "nav-users" }] : []),
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
  );
}

/**
 * On a site's own address: only that site's admin. No sites list, templates, users or "New site";
 * the site's tabs (AdminSiteChrome) are the navigation.
 */
function SiteAdminChrome({ siteId, children }: { siteId: string; children: ReactNode }) {
  const home = `/admin/sites/${siteId}`;
  return (
    <TourProvider tour={adminTour}>
      <TourContextSync firstSiteId={siteId} />
      <AppShell
        brand="Sulva Sites"
        brandHref={home}
        bareRoutes="^/admin/sites/[^/]+/preview$"
        links={[]}
        right={
          <>
            <TourButton />
            <LogoutButton variant="glass" />
          </>
        }
      >
        {children}
      </AppShell>
    </TourProvider>
  );
}
