"use client";

import { useState } from "react";

import TemplateThumb from "@/components/marketing/TemplateThumb";
import { TEMPLATE_GROUPS } from "@/lib/marketing/content";
import { TEMPLATE_META } from "@/templates/meta";

export default function TemplateGallery() {
  const [group, setGroup] = useState<string>("all");
  const keys = group === "all" ? null : new Set(TEMPLATE_GROUPS.find((g) => g.id === group)?.keys ?? []);
  const list = TEMPLATE_META.filter((t) => !keys || keys.has(t.key));
  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setGroup(id)}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1 ${
        group === id ? "bg-koi-ink text-white ring-koi-ink" : "bg-white text-koi-ink ring-koi-ink/10 hover:ring-koi-deep/40"
      }`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {chip("all", "All")}
        {TEMPLATE_GROUPS.map((g) => chip(g.id, g.label))}
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <div key={t.key}>
            <TemplateThumb templateKey={t.key} name={t.name} category={t.category} />
            <p className="mt-1 text-sm text-koi-ink/60">{t.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
