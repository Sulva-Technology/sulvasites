"use client";

import Link from "next/link";
import { useState } from "react";

import { COMPARE_ROWS, planFeatures } from "@/lib/billing/planFeatures";
import {
  DOMAIN_ADDONS, PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, setupFee,
  type Interval, type OfferedPlan,
} from "@/lib/marketing/pricing";

type Path = "diy" | "dfy";

export default function PricingTable({ plans, launch, endLabel }: { plans: OfferedPlan[]; launch: boolean; endLabel: string }) {
  const [path, setPath] = useState<Path>("diy");
  const [period, setPeriod] = useState<Interval>("monthly");
  const per = period === "monthly" ? "/mo" : "/yr";

  const toggle = <T extends string>(value: T, set: (v: T) => void, options: Array<[T, string]>) => (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-koi-ink/10">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          className={`rounded-full px-4 py-2 text-sm ${value === v ? "bg-koi-ink text-white" : "text-koi-ink/70"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {toggle(path, setPath, [["diy", "Do it yourself"], ["dfy", "Done for you"]])}
        {toggle(period, setPeriod, [["monthly", "Monthly"], ["annually", "Yearly · 2 months free"]])}
      </div>
      <p className="mt-4 text-center text-sm text-koi-ink/70">
        {path === "diy"
          ? `${TRIAL_DAYS} days free, no card. No setup fee.`
          : "We design, write and launch it for you. One-time setup fee, then the same plan price."}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const p = plans.find((x) => x.tier === tier && x.interval === period)!;
          const featured = tier === "business";
          const cta = path === "diy"
            ? { href: `/signup?plan=${tier}&interval=${period}`, label: `Start ${TRIAL_DAYS}-day free trial` }
            : { href: `/start?plan=${tier}`, label: "Have us build it" };
          return (
            <div
              key={tier}
              className={`relative flex flex-col rounded-3xl bg-white p-6 ring-1 ${featured ? "ring-2 ring-koi-deep" : "ring-koi-ink/5"}`}
            >
              {featured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-koi-deep px-3 py-1 text-xs font-medium text-white">Most popular</span>
              ) : null}
              <p className="text-lg font-semibold">{PLAN_INFO[tier].name}</p>
              <p className="mt-1 text-sm text-koi-ink/70">{PLAN_INFO[tier].blurb}</p>
              <p className="mt-5 text-4xl font-semibold">
                {formatNaira(p.price)}<span className="text-base font-normal text-koi-ink/60">{per}</span>
              </p>
              {launch ? <p className="text-sm text-koi-ink/50"><s>{formatNaira(p.standardPrice)}{per}</s> · launch price for life</p> : null}
              {path === "dfy" ? (
                <p className="mt-2 text-sm">
                  + {formatNaira(setupFee(tier, launch))} one-time setup
                  {launch ? <span className="text-koi-ink/50"> (<s>{formatNaira(setupFee(tier, false))}</s>)</span> : null}
                </p>
              ) : null}
              <Link
                href={cta.href}
                className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-medium ${featured ? "bg-koi-deep text-white" : "bg-koi-paper text-koi-ink ring-1 ring-koi-ink/10"}`}
              >
                {cta.label}
              </Link>
            </div>
          );
        })}
      </div>
      {launch ? <p className="mt-4 text-center text-sm text-koi-ink/60">Launch pricing ends {endLabel}. Subscribe before then and keep your price.</p> : null}

      <div className="mt-16 overflow-x-auto rounded-3xl bg-white ring-1 ring-koi-ink/5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-koi-ink/10 text-left">
              <th className="p-4 font-medium">Compare plans</th>
              {TIERS.map((t) => <th key={t} className="p-4 text-center font-medium">{PLAN_INFO[t].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-koi-ink/5 last:border-0">
                <td className="p-4 text-koi-ink/80">{row.label}</td>
                {TIERS.map((t) => {
                  const v = row.value(planFeatures(t));
                  return (
                    <td key={t} className="p-4 text-center">
                      {v === true ? <span className="text-koi-deep">✓</span> : v === false ? <span className="text-koi-ink/30">—</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
        <p className="text-lg font-semibold">Add-on: we buy and manage your domain</p>
        <p className="mt-1 text-sm text-koi-ink/70">We register it in your business name, connect it, handle SSL and renew it every year.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {DOMAIN_ADDONS.map((d) => (
            <span key={d.tld} className="rounded-full bg-koi-paper px-4 py-2 text-sm ring-1 ring-koi-ink/10">
              {d.tld} · {formatNaira(d.yearly)}/yr
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-koi-ink/60">Already own a domain? Connecting it is free on Business and Commerce.</p>
      </div>
    </>
  );
}
