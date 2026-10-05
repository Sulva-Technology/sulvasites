"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import DashboardUser from "@/components/dashboard/DashboardUser";
import { useMember } from "@/components/RequireMember";
import { TourButton } from "@/components/tour/TourButton";
import { TourProvider } from "@/components/tour/TourProvider";
import { AppShell } from "@/components/ui/AppShell";
import { ownerTour } from "@/lib/tour/ownerTour";

/** Koi shell for the owner dashboard: one nav link per site the user belongs to. */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const { memberships } = useMember();
  const links = memberships.map((m) => ({ href: `/dashboard/${m.siteId}`, label: m.businessName }));
  const firstSiteId = memberships[0]?.siteId;
  const baseContext = useMemo(
    () => ({ siteCount: memberships.length, firstSiteId }),
    [memberships.length, firstSiteId],
  );
  return (
    <TourProvider tour={ownerTour} baseContext={baseContext}>
      <AppShell
        brand="Sulva · Dashboard"
        brandHref="/dashboard"
        links={links}
        right={
          <div className="flex items-center gap-1">
            <TourButton />
            <DashboardUser />
          </div>
        }
      >
        {children}
      </AppShell>
    </TourProvider>
  );
}
