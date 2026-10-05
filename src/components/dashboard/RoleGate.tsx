"use client";

import type { ReactNode } from "react";

import { useSite } from "@/components/dashboard/SiteShell";
import type { SiteRole } from "@/lib/siteAccess";

/** Renders children only when the caller's role on this site is allowed (UI guard; RLS is the real enforcement). */
export default function RoleGate({
  allow,
  children,
}: {
  allow: Array<SiteRole | "admin">;
  children: ReactNode;
}) {
  const { role } = useSite();
  if (!allow.includes(role)) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your role does not have access to this section.
      </div>
    );
  }
  return <>{children}</>;
}
