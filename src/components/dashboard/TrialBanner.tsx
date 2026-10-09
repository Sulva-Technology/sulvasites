"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BILLING_CHANGED_EVENT } from "@/components/dashboard/BillingPanel";
import { apiFetch } from "@/components/shop-admin/common";

type Mini = { subscription: { status: string } | null; trialDaysLeft: number };

/** Shown above the tabs for trial, past-due and paused sites. Owners and admins only (the API 403s for staff). */
export default function TrialBanner({ siteId }: { siteId: string }) {
  const [v, setV] = useState<Mini | null>(null);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void apiFetch<Mini>(`/api/billing/${siteId}`).then((r) => {
        if (!cancelled && r.ok) setV(r.data);
      });
    };
    refresh();
    window.addEventListener(BILLING_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(BILLING_CHANGED_EVENT, refresh);
    };
  }, [siteId]);
  const s = v?.subscription?.status;
  if (!v || !s || !["trialing", "past_due", "paused", "archived"].includes(s)) return null;
  const text =
    s === "trialing" ? `${v.trialDaysLeft} day${v.trialDaysLeft === 1 ? "" : "s"} left in your free trial.`
      : s === "past_due" ? "Your last payment failed."
        : s === "archived" ? "Your site is archived."
          : "Your site is paused.";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-koi-ink px-4 py-3 text-sm text-white">
      <span>{text}</span>
      <Link href={`/dashboard/${siteId}/billing`} className="rounded-full bg-white px-4 py-1.5 font-medium text-koi-ink">
        {s === "past_due" ? "Pay now" : "Keep my site live"}
      </Link>
    </div>
  );
}
