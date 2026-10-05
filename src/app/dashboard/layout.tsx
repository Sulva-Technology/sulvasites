import type { ReactNode } from "react";
import Link from "next/link";

import DashboardUser from "@/components/dashboard/DashboardUser";
import RequireMember from "@/components/RequireMember";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireMember>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-gray-900 hover:text-gray-600"
            >
              Sulva Sites · Dashboard
            </Link>
            <DashboardUser />
          </div>
        </header>
        <main className="mx-auto max-w-5xl bg-gray-50 p-6">{children}</main>
      </div>
    </RequireMember>
  );
}
