"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMember } from "@/components/RequireMember";

export default function DashboardHomePage() {
  const router = useRouter();
  const { memberships, isAdmin } = useMember();

  const onlySiteId = memberships.length === 1 && !isAdmin ? memberships[0]!.siteId : null;
  useEffect(() => {
    if (onlySiteId) router.replace(`/dashboard/${onlySiteId}`);
  }, [onlySiteId, router]);

  if (onlySiteId) return <div className="text-sm text-gray-600">Loading…</div>;

  if (memberships.length === 0) {
    return (
      <div className="space-y-2 text-sm text-gray-700">
        <p>You are signed in as a Sulvatech admin and are not a member of any site.</p>
        <Link href="/admin/sites" className="underline">
          Go to admin sites
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Your sites</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {memberships.map((m) => (
          <li key={m.siteId}>
            <Link
              href={`/dashboard/${m.siteId}`}
              className="block rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 hover:ring-gray-400"
            >
              <div className="font-medium text-gray-900">{m.businessName}</div>
              <div className="mt-1 text-xs text-gray-500">
                {m.role === "owner" ? "Owner" : "Staff"} · {m.site.status}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
