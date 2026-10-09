"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";
import { DOMAIN_ADDONS, PLAN_INFO, TIERS, formatNaira, type Interval, type OfferedPlan, type Tier } from "@/lib/marketing/pricing";

/** Fired after every successful billing load so the trial banner can refetch. */
export const BILLING_CHANGED_EVENT = "billing:changed";

type View = {
  subscription: {
    status: string; tier: Tier; interval: Interval; plan_id: string | null; trial_ends_at: string | null;
    current_period_end: string | null; grace_ends_at: string | null; hasCard: boolean;
  } | null;
  live: boolean;
  trialDaysLeft: number;
  plans: OfferedPlan[];
  events: Array<{ kind: string; amount_kobo: number | null; status: string; plan_id: string | null; created_at: string }>;
  domainRequests: Array<{ desired_name: string; status: string; renews_at: string | null }>;
  role: string;
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

function headline(v: View): { tone: "ok" | "warn" | "error" | "info"; text: string } {
  const s = v.subscription;
  if (!s || s.status === "manual") return { tone: "info", text: "This site is managed and billed by Sulvatech." };
  switch (s.status) {
    case "trialing": return { tone: "warn", text: `Free trial: ${v.trialDaysLeft} day${v.trialDaysLeft === 1 ? "" : "s"} left. Pick a plan to keep your site live.` };
    case "active": return { tone: "ok", text: `${PLAN_INFO[s.tier].name} plan · renews ${fmtDate(s.current_period_end)}` };
    case "past_due": return { tone: "error", text: `Your last payment failed. Pay now before ${fmtDate(s.grace_ends_at)} to keep your site live.` };
    case "cancelling": return { tone: "warn", text: `Cancelled · your site stays live until ${fmtDate(s.current_period_end)}.` };
    case "paused": return { tone: "error", text: "Your site is paused. Pick a plan to bring it back instantly." };
    default: return { tone: "error", text: "Your site is archived. Pick a plan to restore it." };
  }
}

export default function BillingPanel({ siteId }: { siteId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("business");
  const [interval, setPeriod] = useState<Interval>("monthly");
  const [busy, setBusy] = useState(false);
  const [domain, setDomain] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const seeded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const ref = new URLSearchParams(window.location.search).get("ref");
    void apiFetch<View>(`/api/billing/${siteId}${ref ? `?verify=${encodeURIComponent(ref)}` : ""}`).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setError(r.data.error ?? "Could not load billing.");
        return;
      }
      setView(r.data);
      if (r.data.subscription && !seeded.current) {
        seeded.current = true;
        setTier(r.data.subscription.tier);
        setPeriod(r.data.subscription.interval);
      }
      if (ref) window.history.replaceState(null, "", window.location.pathname);
      window.dispatchEvent(new Event(BILLING_CHANGED_EVENT));
    });
    return () => {
      cancelled = true;
    };
  }, [siteId, reloadKey]);

  async function pay() {
    setBusy(true);
    setError(null);
    const r = await apiFetch<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ siteId, tier, interval }) });
    if (r.ok && r.data.url) window.location.href = r.data.url;
    else { setError(r.data.error ?? "Could not start checkout."); setBusy(false); }
  }

  async function action(name: "cancel" | "manage" | "domain") {
    if (name === "cancel" && !window.confirm("Cancel your subscription? Your site stays live until the end of the paid period.")) return;
    setBusy(true);
    setError(null);
    const r = await apiFetch<{ url?: string }>(`/api/billing/${siteId}`, { method: "POST", body: JSON.stringify({ action: name, desiredName: domain }) });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "Something went wrong.");
    if (r.data.url) window.location.href = r.data.url;
    else { setDomain(""); setReloadKey((k) => k + 1); }
  }

  if (!view) return error ? <Notice kind="error">{error}</Notice> : <p className="text-sm">Loading…</p>;
  const s = view.subscription;
  const h = headline(view);
  const managed = !s || s.status === "manual";
  const plan = view.plans.find((p) => p.tier === tier && p.interval === interval);
  const isOwner = view.role === "owner";

  return (
    <div className="space-y-4">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Notice kind={h.tone}>{h.text}</Notice>

      {!managed && isOwner && plan ? (
        <div className={cardCls}>
          <p className="font-medium">{s?.status === "past_due" ? "Pay now to keep your site live" : s && ["active", "cancelling"].includes(s.status) ? "Change plan" : "Keep my site live"}</p>
          <div className="mt-3 inline-flex rounded-full bg-koi-paper p-1 ring-1 ring-koi-ink/10">
            {(["monthly", "annually"] as const).map((i) => (
              <button key={i} type="button" onClick={() => setPeriod(i)} className={`rounded-full px-4 py-1.5 text-sm ${interval === i ? "bg-koi-ink text-white" : ""}`}>
                {i === "monthly" ? "Monthly" : "Yearly · 2 months free"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const p = view.plans.find((x) => x.tier === t && x.interval === interval);
              if (!p) return null;
              return (
                <button key={t} type="button" onClick={() => setTier(t)} className={`rounded-2xl p-4 text-left ring-2 ${tier === t ? "ring-koi-deep" : "ring-koi-ink/10"}`}>
                  <p className="font-medium">{PLAN_INFO[t].name}</p>
                  <p className="mt-1 text-lg font-semibold">{formatNaira(p.price)}<span className="text-sm font-normal">{interval === "monthly" ? "/mo" : "/yr"}</span></p>
                  {p.launch ? <p className="text-xs text-koi-ink/50 line-through">{formatNaira(p.standardPrice)}</p> : null}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={busy} onClick={pay} className="mt-4 rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-50">
            {s?.status === "past_due" ? "Pay now" : "Pay"} {formatNaira(plan.price)} with card
          </button>
          <p className="mt-2 text-xs text-koi-ink/60">
            Secure payment by Paystack. Renews automatically; cancel any time. Unused trial or paid days are added before your new period starts.
          </p>
        </div>
      ) : null}

      {!managed && isOwner && s?.hasCard ? (
        <div className={`${cardCls} flex flex-wrap gap-3`}>
          <button type="button" disabled={busy} onClick={() => action("manage")} className="rounded-full px-4 py-2 text-sm ring-1 ring-koi-ink/15">Update card</button>
          {["active", "past_due"].includes(s.status) ? (
            <button type="button" disabled={busy} onClick={() => action("cancel")} className="rounded-full px-4 py-2 text-sm text-koi-orange ring-1 ring-koi-orange/30">Cancel subscription</button>
          ) : null}
        </div>
      ) : null}

      {isOwner ? (
        <div className={cardCls}>
          <p className="font-medium">Domain add-on</p>
          <p className="mt-1 text-sm text-koi-ink/70">
            We buy and manage a domain for you: {DOMAIN_ADDONS.map((d) => `${d.tld} ${formatNaira(d.yearly)}/yr`).join(" · ")}. We&apos;ll confirm availability and send a payment link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbusiness.com.ng" aria-label="Domain name" className="min-w-0 flex-1 rounded-full px-4 py-2 text-sm ring-1 ring-koi-ink/15" />
            <button type="button" disabled={busy || !domain} onClick={() => action("domain")} className="rounded-full bg-koi-ink px-4 py-2 text-sm text-white disabled:opacity-50">Request</button>
          </div>
          {view.domainRequests.length ? (
            <ul className="mt-3 text-sm">
              {view.domainRequests.map((d, i) => <li key={`${d.desired_name}-${i}`}>{d.desired_name} · {d.status}{d.renews_at ? ` · renews ${fmtDate(d.renews_at)}` : ""}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {view.events.length ? (
        <div className={cardCls}>
          <p className="font-medium">Payment history</p>
          <ul className="mt-2 divide-y divide-koi-ink/5 text-sm">
            {view.events.map((e, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span>{fmtDate(e.created_at)} · {e.kind.replace(/_/g, " ")}</span>
                <span>{e.amount_kobo ? formatNaira(e.amount_kobo / 100) : ""} {e.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
