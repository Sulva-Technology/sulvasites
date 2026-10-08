import type { Metadata } from "next";

import Faq from "@/components/marketing/Faq";
import MarketingShell from "@/components/marketing/MarketingShell";
import PricingTable from "@/components/marketing/PricingTable";
import { PRICING_FAQ } from "@/lib/marketing/content";
import { isPromoActive, offeredPlans, promoEndLabel } from "@/lib/marketing/pricing";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing — Sulva Sites",
  description: "Simple monthly plans for your business website. 7 days free, or let us build it for you.",
};

export default function PricingPage() {
  const now = new Date();
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          Pricing that <span className="font-serif font-normal italic text-koi-deep">grows with you</span>
        </h1>
        <div className="mt-10">
          <PricingTable plans={offeredPlans(now)} launch={isPromoActive(now)} endLabel={promoEndLabel()} />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pt-20">
        <h2 className="mb-6 text-2xl font-semibold">Pricing questions</h2>
        <Faq items={PRICING_FAQ} />
      </section>
    </MarketingShell>
  );
}
