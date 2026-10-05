"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMember } from "@/components/RequireMember";
import { Card } from "@/components/ui/Card";
import { useShellHero } from "@/components/ui/AppShell";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";

export default function DashboardHomePage() {
  const router = useRouter();
  const { memberships, isAdmin } = useMember();

  useShellHero(
    <PageHero
      status={
        <StatusPill tone="live" onDark>
          {memberships.length} {memberships.length === 1 ? "site" : "sites"}
        </StatusPill>
      }
      title="Your sites"
      accent="all in one place"
    />,
  );

  const onlySiteId = memberships.length === 1 && !isAdmin ? memberships[0]!.siteId : null;
  useEffect(() => {
    if (onlySiteId) router.replace(`/dashboard/${onlySiteId}`);
  }, [onlySiteId, router]);

  if (onlySiteId) return <Card><p className="text-sm text-koi-ink/60">Loading…</p></Card>;

  if (memberships.length === 0) {
    return (
      <Card className="space-y-2 text-sm text-koi-ink/75">
        <p>You are signed in as a Sulvatech admin and are not a member of any site.</p>
        <Link href="/admin/sites" className="underline">
          Go to admin sites
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Your sites</h1>
      <ul data-tour="site-cards" className="grid gap-4 sm:grid-cols-2">
        {memberships.map((m) => (
          <li key={m.siteId}>
            <Link
              href={`/dashboard/${m.siteId}`}
              className="block rounded-3xl bg-white p-4 sm:p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5 transition hover:ring-koi-sea/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
            >
              <div className="text-base font-semibold tracking-tight text-koi-ink">{m.businessName}</div>
              <div className="mt-1 text-xs text-koi-ink/55">
                {m.role === "owner" ? "Owner" : "Staff"} · {m.site.status}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
