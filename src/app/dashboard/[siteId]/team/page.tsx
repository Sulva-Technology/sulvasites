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
    <section className="rounded-3xl bg-white p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <h2 className="text-lg font-semibold tracking-tight text-koi-ink">Team</h2>
      <p className="mt-1 mb-4 text-sm text-koi-ink/60">People who can sign in to this dashboard.</p>
      <TeamManager siteId={siteId} actor={role === "admin" ? "admin" : "owner"} currentUserId={userId} />
    </section>
  );
}
