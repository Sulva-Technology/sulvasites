"use client";

import { useParams } from "next/navigation";

import BusinessManager from "@/components/business/BusinessManager";
import { useSite } from "@/components/dashboard/SiteShell";

export default function DashboardBusinessKindPage() {
  const { kind } = useParams<{ kind: string }>();
  const { siteId, site } = useSite();
  return (
    <BusinessManager siteId={siteId} basePath={`/dashboard/${siteId}/business`} kind={String(kind)} templateKey={site.template_key} />
  );
}
