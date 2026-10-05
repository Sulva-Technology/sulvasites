"use client";

import { AppShell, useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";

function DemoPage() {
  useShellHero(
    <PageHero
      status={<StatusPill tone="live" onDark>Published · koi.example.com</StatusPill>}
      title="Koi & Co Studio"
      accent="T1 · Studio"
      actions={
        <>
          <PillButton href="/dev/ui/shell">Open editor</PillButton>
          <PillButton variant="glass" href="/dev/ui/shell">
            Preview
          </PillButton>
        </>
      }
    />,
  );
  return (
    <div className="space-y-6">
      <Tabs
        label="Site sections"
        active="overview"
        items={[
          { id: "overview", label: "Overview", href: "/dev/ui/shell" },
          { id: "pages", label: "Pages", href: "/dev/ui/shell#pages" },
          { id: "business", label: "Business", href: "/dev/ui/shell#business" },
          { id: "inbox", label: "Inbox", href: "/dev/ui/shell#inbox" },
          { id: "insights", label: "Insights", href: "/dev/ui/shell#insights" },
          { id: "shop", label: "Shop", href: "/dev/ui/shell#shop" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {["Logo", "Domains", "Extra pages", "Team"].map((t) => (
          <Card key={t}>
            <CardHeader title={t} description="Sample card content." action={<PillButton variant="quiet" size="sm">Edit</PillButton>} />
            <p className="text-sm text-koi-ink/60">Lorem ipsum content sits on white.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ShellDemo() {
  return (
    <AppShell
      brand="Sulva Sites"
      brandHref="/dev/ui/shell"
      links={[
        { href: "/dev/ui/shell", label: "Sites" },
        { href: "/dev/ui", label: "Gallery" },
      ]}
      right={
        <PillButton href="/dev/ui" variant="white" size="sm" arrow={false}>
          New site
        </PillButton>
      }
    >
      <DemoPage />
    </AppShell>
  );
}
