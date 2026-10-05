"use client";

import RoleGate from "@/components/dashboard/RoleGate";
import { useSite } from "@/components/dashboard/SiteShell";
import { useMember } from "@/components/RequireMember";
import TeamManager from "@/components/team/TeamManager";

export default function DashboardTeamPage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Team />
    </RoleGate>
  );
}

function Team() {
  const { siteId, role } = useSite();
  const { userId } = useMember();
  return (
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold">Team</h2>
      <p className="mt-1 mb-4 text-sm text-gray-600">People who can sign in to this dashboard.</p>
      <TeamManager siteId={siteId} actor={role === "admin" ? "admin" : "owner"} currentUserId={userId} />
    </section>
  );
}
