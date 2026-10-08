import type { Metadata } from "next";

import LeadForm from "@/components/marketing/LeadForm";
import MarketingShell from "@/components/marketing/MarketingShell";
import { HOW_IT_WORKS } from "@/lib/marketing/content";
import { formatNaira, isPromoActive, isTier, setupFee } from "@/lib/marketing/pricing";

export const metadata: Metadata = {
  title: "Have us build it — Sulva Sites",
  description: "Tell us about your business and our team designs, writes and launches your website.",
};

export default async function StartPage({ searchParams }: { searchParams: Promise<{ template?: string; plan?: string }> }) {
  const { template, plan } = await searchParams;
  const launch = isPromoActive();
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-14">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          We&apos;ll build it <span className="font-serif font-normal italic text-koi-deep">for you</span>
        </h1>
        <ol className="mt-6 grid gap-3 text-sm text-koi-ink/80 sm:grid-cols-3">
          {HOW_IT_WORKS.dfy.map((s, i) => <li key={s}><span className="font-medium text-koi-deep">{i + 1}.</span> {s}</li>)}
        </ol>
        <p className="mt-4 text-sm text-koi-ink/60">
          One-time setup from {formatNaira(setupFee("starter", launch))}, then your monthly plan.
        </p>
        <div className="mt-10">
          <LeadForm template={template} plan={isTier(plan) ? plan : undefined} />
        </div>
      </section>
    </MarketingShell>
  );
}
