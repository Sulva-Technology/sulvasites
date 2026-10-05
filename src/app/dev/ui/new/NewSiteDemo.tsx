"use client";

import NewSitePage from "@/app/admin/sites/new/page";
import { AppShell } from "@/components/ui/AppShell";

export default function NewSiteDemo() {
  return (
    <AppShell brand="Sulva Sites" brandHref="/dev/ui/new" links={[{ href: "/dev/ui/new", label: "New site" }, { href: "/dev/ui", label: "Gallery" }]}>
      <NewSitePage />
    </AppShell>
  );
}
