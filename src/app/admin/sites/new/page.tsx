"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import SiteAssistant from "@/components/admin/SiteAssistant";
import { createPresetPages } from "@/lib/extraPages";
import { TEMPLATE_META, templateLabel } from "@/templates/meta";
import { slugify } from "@/lib/slugify";
import { platformDomain } from "@/lib/hostSite";
import { safeSlug } from "@/lib/reservedSlugs";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";

const templateOptions = TEMPLATE_META.map((t) => t.key);

function ManualSetup({ initialTemplate }: { initialTemplate: string | null }) {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [templateKey, setTemplateKey] = useState<string>(initialTemplate ?? "t1");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalSlug = safeSlug(slug, "");
    if (!finalSlug) {
      setError("Please enter a business name (or a valid slug).");
      return;
    }

    setIsSaving(true);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();
      const { data, error } = await supabase
        .from("sites")
        .insert({ slug: finalSlug, template_key: templateKey })
        .select("id")
        .single();

      if (error) {
        const msg = formatSupabaseError(error);
        if (
          error.code === "23505" ||
          (msg ?? "").toLowerCase().includes("duplicate key")
        ) {
          setError(
            `That slug is already taken. Try a different one (e.g. "${finalSlug}-2").`,
          );
          return;
        }
        setError(msg);
        return;
      }

      // Seed the template's recommended pages (drafts). Non-fatal: they can be
      // added later from the site page if this fails (e.g. extra_pages missing).
      try {
        await createPresetPages(data.id, templateKey, []);
      } catch (seedErr) {
        console.warn("Could not create recommended pages:", seedErr);
      }

      router.replace(`/admin/sites/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Site details" />
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Business name"
          value={businessName}
          onChange={(e) => {
            const nextName = e.target.value;
            setBusinessName(nextName);
            if (!slugTouched) setSlug(slugify(nextName));
          }}
          placeholder="Kings Bakery"
          required
        />

        <TextField
          label="Slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="kings-bakery"
          required
          hint={
            <>
              Preview URL:{" "}
              <span className="font-mono">https://{safeSlug(slug, "your-slug")}.{platformDomain()}</span>
            </>
          }
        />

        <SelectField
          label="Template"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
          hint={`${TEMPLATE_META.find((t) => t.key === templateKey)?.description ?? ""} Recommended pages are added as drafts.`}
        >
          {templateOptions.map((t) => (
            <option key={t} value={t}>
              {templateLabel(t)}
            </option>
          ))}
        </SelectField>

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <PillButton type="submit" loading={isSaving}>
          {isSaving ? "Creating…" : "Create site"}
        </PillButton>
      </form>
    </Card>
  );
}

export default function NewSitePage() {
  return (
    <Suspense>
      <NewSite />
    </Suspense>
  );
}

function NewSite() {
  // "Use this template" in /admin/templates links here with ?template=tN → manual setup
  // with that template preselected (the assistant picks its own).
  const picked = useSearchParams().get("template");
  const initialTemplate = picked && templateOptions.includes(picked) ? picked : null;
  const [mode, setMode] = useState<"assistant" | "manual">(initialTemplate ? "manual" : "assistant");

  useShellHero(
    <PageHero
      status={
        <StatusPill tone="live" onDark>
          {mode === "assistant" ? "AI assistant" : "Manual setup"}
        </StatusPill>
      }
      title="Tell us about the business"
      accent="we'll build the rest"
      subtitle={
        mode === "assistant"
          ? "Describe the business and the assistant picks a template, writes the pages and adds photos."
          : "Create a new SME site. Pages + profile will be auto-created by the DB."
      }
    />,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Tabs
        label="Setup mode"
        tourId="assistant-mode"
        active={mode}
        onChange={(id) => setMode(id as "assistant" | "manual")}
        items={[
          { id: "assistant", label: "Assistant" },
          { id: "manual", label: "Manual setup" },
        ]}
      />

      <div role="tabpanel" aria-label={mode === "assistant" ? "Assistant" : "Manual setup"}>
        {mode === "assistant" ? (
          <SiteAssistant />
        ) : (
          <div className="max-w-xl">
            <ManualSetup initialTemplate={initialTemplate} />
          </div>
        )}
      </div>
    </div>
  );
}
