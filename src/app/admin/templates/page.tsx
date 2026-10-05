"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { TEMPLATE_META } from "@/templates/meta";

type Filter = "all" | "sites" | "shops";

/** Live, non-interactive thumbnail: the sample preview rendered at desktop width, scaled to 25%. */
function Thumb({ templateKey }: { templateKey: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-koi-ink/5 ring-1 ring-koi-ink/5">
      <iframe
        src={`/admin/templates/${templateKey}?embed=1`}
        title=""
        aria-hidden="true"
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-25 border-0"
      />
    </div>
  );
}

export default function AdminTemplatesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const shops = TEMPLATE_META.filter((t) => t.shop).length;
    return { all: TEMPLATE_META.length, shops, sites: TEMPLATE_META.length - shops };
  }, []);

  const shown = TEMPLATE_META.filter((t) => (filter === "all" ? true : filter === "shops" ? t.shop : !t.shop));

  useShellHero(
    <PageHero
      status={
        <StatusPill tone="live" onDark>
          {`${counts.all} templates · sample content`}
        </StatusPill>
      }
      title="Templates"
      accent="try before you build"
      actions={<PillButton href="/admin/sites/new">New site</PillButton>}
    />,
  );

  return (
    <div className="space-y-5">
      <Tabs
        label="Filter templates"
        active={filter}
        onChange={(id) => setFilter(id as Filter)}
        items={[
          { id: "all", label: "All", count: counts.all },
          { id: "sites", label: "Websites", count: counts.sites },
          { id: "shops", label: "Online shops", count: counts.shops },
        ]}
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <li key={t.key}>
            <Card as="div" className="flex h-full flex-col gap-4 p-3">
              <Link
                href={`/admin/templates/${t.key}`}
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
                aria-label={`Preview ${t.name}`}
              >
                <Thumb templateKey={t.key} />
              </Link>
              <div className="flex flex-1 flex-col gap-3 px-3 pb-3">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate text-base font-semibold tracking-tight">{t.name}</h2>
                    <span className="shrink-0 rounded-full bg-koi-sea/10 px-2.5 py-0.5 text-xs font-medium text-koi-deep">
                      {t.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-koi-ink/60">{t.description}</p>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <PillButton href={`/admin/templates/${t.key}`} variant="quiet" size="sm" arrow={false}>
                    Preview
                  </PillButton>
                  <PillButton href={`/admin/sites/new?template=${t.key}`} size="sm">
                    Use template
                  </PillButton>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
