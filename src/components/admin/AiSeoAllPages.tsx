"use client";

import AiSeoButton from "@/components/admin/AiSeoButton";
import { fetchSeoProfile } from "@/components/admin/seoProfile";
import type { SeoPageInput } from "@/lib/ai/seo";
import { validatePageData, type PageData } from "@/lib/pageSchema";
import { getAuthenticatedClient } from "@/lib/supabase/browser";

const KEYS = ["home", "about", "contact"] as const;

export default function AiSeoAllPages({ siteId }: { siteId: string }) {
  return (
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold">AI SEO &amp; image alt text</h2>
      <p className="mt-1 text-sm text-gray-600">
        Writes page titles, meta descriptions and gallery alt text for Home, About and Contact from your page content.
        You review each suggestion before anything is saved. Changes are saved as drafts.
      </p>
      <div className="mt-4">
        <AiSeoButton
          label="Improve SEO for all pages"
          load={async () => {
            const supabase = await getAuthenticatedClient();
            const { data, error } = await supabase
              .from("pages")
              .select("key, data")
              .eq("site_id", siteId)
              .in("key", [...KEYS]);
            if (error) throw error;
            const pages: SeoPageInput[] = [];
            for (const row of data ?? []) {
              if (validatePageData(row.data).ok && Array.isArray((row.data as PageData).sections)) {
                pages.push({ key: row.key as string, data: row.data as PageData });
              }
            }
            if (pages.length === 0) throw new Error("No page content yet. Generate or edit your pages first.");
            return { pages, profile: await fetchSeoProfile(siteId) };
          }}
          onApply={async (updated) => {
            const supabase = await getAuthenticatedClient();
            for (const [key, data] of Object.entries(updated)) {
              const { error } = await supabase
                .from("pages")
                .update({ data, status: "draft" })
                .eq("site_id", siteId)
                .eq("key", key);
              if (error) throw error;
            }
          }}
        />
      </div>
    </section>
  );
}
