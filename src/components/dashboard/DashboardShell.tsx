"use client";

import type { ReactNode } from "react";

import DashboardUser from "@/components/dashboard/DashboardUser";
import { useMember } from "@/components/RequireMember";
import { AppShell } from "@/components/ui/AppShell";

/** Koi shell for the owner dashboard: one nav link per site the user belongs to. */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const { memberships } = useMember();
  const links = memberships.map((m) => ({ href: `/dashboard/${m.siteId}`, label: m.businessName }));
  return (
    <AppShell brand="Sulva · Dashboard" brandHref="/dashboard" links={links} right={<DashboardUser />}>
      {children}
    </AppShell>
  );
}
