import type { ReactNode } from "react";
import Link from "next/link";

import LogoutButton from "@/components/LogoutButton";
import RequireAdmin from "@/components/RequireAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link
                href="/admin/sites"
                className="text-sm font-semibold tracking-tight text-gray-900 hover:text-gray-600"
              >
                Sulva Sites
              </Link>
              <nav className="flex gap-4 text-sm">
                <Link
                  href="/admin/sites"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sites
                </Link>
                <Link
                  href="/admin/users"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Users
                </Link>
              </nav>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto max-w-5xl p-6 bg-gray-50">{children}</main>
      </div>
    </RequireAdmin>
  );
}

