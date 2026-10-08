import type { Metadata } from "next";
import Link from "next/link";

import Faq from "@/components/marketing/Faq";
import MarketingShell from "@/components/marketing/MarketingShell";
import TemplateThumb from "@/components/marketing/TemplateThumb";
import { WaterBackdrop } from "@/components/ui/WaterBackdrop";
import { FEATURES, HOME_FAQ, HOW_IT_WORKS, SHOWCASE_KEYS } from "@/lib/marketing/content";
import { PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, offeredPlans } from "@/lib/marketing/pricing";
import { TEMPLATE_META } from "@/templates/meta";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sulva Sites — your business website, live today",
  description: `Beautiful websites for Nigerian businesses with a dashboard, inbox, online shop and blog. ${TRIAL_DAYS} days free.`,
};

export default function HomePage() {
  const plans = offeredPlans().filter((p) => p.interval === "monthly");
  const showcase = SHOWCASE_KEYS.map((k) => TEMPLATE_META.find((t) => t.key === k)!);
  return (
    <MarketingShell>
      <section className="relative isolate overflow-hidden">
        {/* WaterBackdrop positions itself (absolute inset-0); -z-10 keeps it behind the isolated content. */}
        <WaterBackdrop className="-z-10 opacity-90" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-white sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your business website, <span className="font-serif font-normal italic">live today.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Pick a design, tell us about your business, and get a site with a dashboard, inbox, online shop and blog.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-full bg-white px-6 py-3 font-medium text-koi-deep hover:bg-koi-paper">
              Start {TRIAL_DAYS}-day free trial
            </Link>
            <Link href="/start" className="rounded-full px-6 py-3 font-medium text-white ring-1 ring-white/60 hover:bg-white/10">
              Have us build it
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">No card needed. Cancel any time.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Seventeen designs, <span className="font-serif font-normal italic">one for you</span></h2>
          <Link href="/templates" className="shrink-0 text-sm text-koi-deep">See all →</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {showcase.map((t) => <TemplateThumb key={t.key} templateKey={t.key} name={t.name} category={t.category} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <h2 className="text-2xl font-semibold sm:text-3xl">Everything included</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5">
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-koi-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-24 md:grid-cols-2">
        {([
          ["Do it yourself", HOW_IT_WORKS.diy, "/signup", `Start free for ${TRIAL_DAYS} days`],
          ["Done for you", HOW_IT_WORKS.dfy, "/start", "Send us your brief"],
        ] as const).map(([title, steps, href, cta]) => (
          <div key={title} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
            <h3 className="text-xl font-semibold">{title}</h3>
            <ol className="mt-5 space-y-3">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-koi-deep text-xs text-white">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href={href} className="mt-6 inline-block text-sm font-medium text-koi-deep">{cta} →</Link>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <h2 className="text-2xl font-semibold sm:text-3xl">Simple monthly pricing</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const p = plans.find((x) => x.tier === tier)!;
            return (
              <div key={tier} className="rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5">
                <p className="font-medium">{PLAN_INFO[tier].name}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatNaira(p.price)}<span className="text-base font-normal text-koi-ink/60">/mo</span>
                </p>
                {p.launch ? <p className="text-sm text-koi-ink/50 line-through">{formatNaira(p.standardPrice)}/mo</p> : null}
                <p className="mt-3 text-sm text-koi-ink/70">{PLAN_INFO[tier].blurb}</p>
              </div>
            );
          })}
        </div>
        <Link href="/pricing" className="mt-6 inline-block text-sm font-medium text-koi-deep">Compare plans →</Link>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-24">
        <h2 className="mb-6 text-2xl font-semibold sm:text-3xl">Questions</h2>
        <Faq items={HOME_FAQ} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <div className="rounded-[2rem] bg-koi-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-semibold">Ready when you are.</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="rounded-full bg-white px-6 py-3 font-medium text-koi-ink">Start free trial</Link>
            <Link href="/start" className="rounded-full px-6 py-3 font-medium ring-1 ring-white/50">Have us build it</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
