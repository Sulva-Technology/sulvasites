"use client";

import LogoutButton from "@/components/LogoutButton";
import { useMember } from "@/components/RequireMember";

export default function DashboardUser() {
  const { email } = useMember();
  return (
    <div className="flex items-center gap-4">
      <span className="hidden text-sm text-gray-600 sm:inline">{email}</span>
      <LogoutButton />
    </div>
  );
}
