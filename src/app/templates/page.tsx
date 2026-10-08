import type { Metadata } from "next";

import MarketingShell from "@/components/marketing/MarketingShell";
import TemplateGallery from "@/components/marketing/TemplateGallery";

export const metadata: Metadata = {
  title: "Templates — Sulva Sites",
  description: "Seventeen website designs for restaurants, shops, clinics, salons, schools, churches and more.",
};

export default function TemplatesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your <span className="font-serif font-normal italic text-koi-deep">look</span>
        </h1>
        <p className="mt-3 max-w-xl text-koi-ink/70">Open any design to click around a full demo site. Your words, photos and colours replace the samples.</p>
        <div className="mt-10"><TemplateGallery /></div>
      </section>
    </MarketingShell>
  );
}
