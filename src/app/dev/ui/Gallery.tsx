"use client";

import { useState } from "react";

import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { GlassNav } from "@/components/ui/GlassNav";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { WaterBackdrop } from "@/components/ui/WaterBackdrop";

export default function Gallery() {
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(false);

  return (
    <div className="koi-app min-h-screen">
      <header className="relative h-[420px]">
        <WaterBackdrop koi />
        <GlassNav
          brand="Sulva Sites"
          links={[
            { href: "/dev/ui", label: "Gallery" },
            { href: "/admin/sites", label: "Sites" },
            { href: "/admin/users", label: "Users" },
          ]}
          right={
            <PillButton variant="white" size="sm" arrow={false} href="/admin/sites/new">
              New site
            </PillButton>
          }
        />
        <div className="relative mx-auto flex h-full max-w-6xl items-end px-4 pb-32 sm:px-6">
          <PageHero
            status={<StatusPill tone="live" onDark>3 live · 1 draft</StatusPill>}
            title="Your sites"
            accent="worth obsessing over"
            subtitle="Every primitive on the water and on paper."
            actions={
              <>
                <PillButton href="/dev/ui">New site</PillButton>
                <PillButton variant="glass" href="/dev/ui">
                  Users
                </PillButton>
              </>
            }
          />
        </div>
      </header>

      <main className="relative mx-auto -mt-24 max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <Card>
          <CardHeader title="Buttons" description="primary · glass · white · quiet, sm + md, loading" />
          <div className="flex flex-wrap items-center gap-3">
            <PillButton>Primary</PillButton>
            <PillButton size="sm">Primary sm</PillButton>
            <PillButton arrow={false}>No arrow</PillButton>
            <PillButton variant="quiet">Quiet</PillButton>
            <PillButton variant="quiet" size="sm">
              Quiet sm
            </PillButton>
            <PillButton
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            >
              {loading ? "Saving…" : "Click to load"}
            </PillButton>
            <PillButton disabled>Disabled</PillButton>
          </div>
          <div className="koi-water mt-4 flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <PillButton variant="glass">Glass</PillButton>
            <PillButton variant="white" arrow={false}>
              White
            </PillButton>
            <PillButton>Primary on water</PillButton>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Status pills" action={<PillButton variant="quiet" size="sm">Action</PillButton>} />
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="live">Published</StatusPill>
              <StatusPill tone="draft">Draft</StatusPill>
              <StatusPill tone="warn">Needs attention</StatusPill>
              <StatusPill>Neutral</StatusPill>
            </div>
            <div className="koi-water mt-4 flex flex-wrap gap-2 rounded-2xl p-4">
              <StatusPill tone="live" onDark>
                Live
              </StatusPill>
              <StatusPill tone="draft" onDark>
                Draft
              </StatusPill>
              <StatusPill tone="warn" onDark>
                Warn
              </StatusPill>
            </div>
          </Card>

          <Card>
            <CardHeader title="Tabs" description={`Button mode (arrow keys). Active: ${tab}`} />
            <Tabs
              label="Filter sites"
              active={tab}
              onChange={setTab}
              items={[
                { id: "all", label: "All", count: 4 },
                { id: "live", label: "Live", count: 3 },
                { id: "draft", label: "Drafts", count: 1 },
              ]}
            />
            <div className="mt-4">
              <Tabs
                label="Site sections"
                active="overview"
                items={[
                  { id: "overview", label: "Overview", href: "/dev/ui" },
                  { id: "pages", label: "Pages", href: "/dev/ui#pages" },
                  { id: "inbox", label: "Inbox", href: "/dev/ui#inbox" },
                ]}
              />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Fields" />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Business name" placeholder="Koi & Co" hint="Shown in the site header." />
            <TextField label="Email" type="email" defaultValue="nope" error="Enter a valid email." />
            <SelectField label="Template" defaultValue="t1">
              <option value="t1">T1 · Studio</option>
              <option value="t2">T2 · Bistro</option>
            </SelectField>
            <TextArea label="About" rows={3} placeholder="Tell us about the business" />
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-6">
            <CardHeader title="Card with p-0" description="Used for chat / tables." />
          </div>
          <div className="border-t border-koi-ink/5 px-6 py-4 text-sm text-koi-ink/60">Footer row</div>
        </Card>
      </main>
    </div>
  );
}
