"use client";

import Link from "next/link";

import RoleGate from "@/components/dashboard/RoleGate";
import { useSite } from "@/components/dashboard/SiteShell";
import ProfileEditor from "@/components/site-editor/ProfileEditor";

export default function DashboardProfilePage() {
  return (
    <RoleGate allow={["owner", "admin"]}>
      <Profile />
    </RoleGate>
  );
}

function Profile() {
  const { siteId } = useSite();
  const basePath = `/dashboard/${siteId}/content`;
  return (
    <div className="space-y-4">
      <Link href={basePath} className="text-sm text-gray-700 underline">
        Back to content
      </Link>
      <ProfileEditor siteId={siteId} mode="owner" basePath={basePath} />
    </div>
  );
}
