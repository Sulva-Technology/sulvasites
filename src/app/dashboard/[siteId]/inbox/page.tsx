"use client";

import { useSite } from "@/components/dashboard/SiteShell";
import InboxView from "@/components/inbox/InboxView";

export default function DashboardInboxPage() {
  const { siteId } = useSite();
  return <InboxView siteId={siteId} />;
}
