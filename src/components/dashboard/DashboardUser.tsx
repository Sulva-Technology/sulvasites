"use client";

import LogoutButton from "@/components/LogoutButton";
import { useMember } from "@/components/RequireMember";

export default function DashboardUser() {
  const { email } = useMember();
  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-[14rem] truncate px-2 text-sm text-white/85 md:inline">{email}</span>
      <LogoutButton variant="glass" />
    </div>
  );
}
