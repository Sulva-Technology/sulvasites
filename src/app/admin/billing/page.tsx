"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";
import { useShellHero } from "@/components/ui/AppShell";
import { PageHero } from "@/components/ui/PageHero";
import { PLAN_INFO, TIERS, formatNaira, type Tier } from "@/lib/marketing/pricing";

type Row = {
  site_id: string; slug: string | null; business_name: string | null; tier: Tier; interval: string; status: string;
  trial_ends_at: string | null; current_period_end: string | null; flagged: string | null; blocked: boolean; created_at: string;
};
type Domain = { id: string; site_id: string; desired_name: string; status: string; renews_at: string | null; notes: string | null };
type Data = { rows: Row[]; mrrKobo: number; domainRequests: Domain[] };

const ORDER = ["past_due", "trialing", "paused", "cancelling", "active", "archived"];
const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

export default function AdminBillingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useShellHero(<PageHero title="Billing" accent="overview" subtitle="Trials, subscriptions, flagged signups and domain requests." />);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<Data>("/api/admin/billing").then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setLoadedAt(Date.now());
      } else setError(r.data.error ?? "Could not load billing.");
    });
    return () => { cancelled = true; };
  }, [version]);

  async function act(body: Record<string, unknown>) {
    setError(null);
    const r = await apiFetch("/api/admin/billing", { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) setError(r.data.error ?? "Action failed.");
    setVersion((v) => v + 1);
  }

  const groups = useMemo(() => {
    const rows = data?.rows ?? [];
    return ORDER.map((status) => ({ status, rows: rows.filter((r) => r.status === status) })).filter((g) => g.rows.length);
  }, [data]);
  const flagged = data?.rows.filter((r) => r.flagged) ?? [];
  const soon = loadedAt + 2 * 86_400_000;
  const endingSoon = data?.rows.filter((r) => r.status === "trialing" && r.trial_ends_at && Date.parse(r.trial_ends_at) < soon) ?? [];

  if (!data) return <div className="p-4">{error ? <Notice kind="error">{error}</Notice> : "Loading…"}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex justify-end">
        <p className="text-sm">MRR <span className="text-xl font-semibold">{formatNaira(data.mrrKobo / 100)}</span></p>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}

      {flagged.length ? (
        <section className={cardCls}>
          <h2 className="font-medium">Flagged signups</h2>
          {flagged.map((r) => (
            <div key={r.site_id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{r.business_name ?? r.slug} · {r.flagged}{r.blocked ? " · BLOCKED" : ""}</span>
              <span className="flex gap-2">
                <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => act({ action: "allow", siteId: r.site_id })}>Allow</button>
                <button className="rounded-full px-3 py-1 text-koi-orange ring-1 ring-koi-orange/30" onClick={() => act({ action: r.blocked ? "unblock" : "block", siteId: r.site_id })}>{r.blocked ? "Unblock" : "Block"}</button>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {endingSoon.length ? <Notice kind="warn">{endingSoon.length} trial(s) end within 48h: {endingSoon.map((r) => r.business_name ?? r.slug).join(", ")}</Notice> : null}

      {groups.map((g) => (
        <section key={g.status} className={cardCls}>
          <h2 className="font-medium capitalize">{g.status.replace("_", " ")} ({g.rows.length})</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.site_id} className="border-t border-koi-ink/5">
                    <td className="py-2">
                      <a href={`/admin/sites/${r.site_id}`} className="font-medium">{r.business_name ?? r.slug}</a>
                      <span className="block text-xs text-koi-ink/50">{r.slug}{r.blocked ? " · BLOCKED" : ""}</span>
                    </td>
                    <td>
                      <select value={r.tier} onChange={(e) => act({ action: "set_tier", siteId: r.site_id, tier: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10">
                        {TIERS.map((t) => <option key={t} value={t}>{PLAN_INFO[t].name}</option>)}
                      </select>
                    </td>
                    <td>{r.interval}</td>
                    <td>{r.status === "trialing" ? `trial ends ${d(r.trial_ends_at)}` : `period ends ${d(r.current_period_end)}`}</td>
                    <td className="space-x-2 text-right">
                      {r.blocked ? <button className="rounded-full px-3 py-1 text-koi-orange ring-1 ring-koi-orange/30" onClick={() => act({ action: "unblock", siteId: r.site_id })}>Unblock</button> : null}
                      <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => {
                        const days = Number(window.prompt("Extend trial by how many days (1–30)?", "7"));
                        if (days) void act({ action: "extend_trial", siteId: r.site_id, days });
                      }}>+ trial</button>
                      <button className="rounded-full px-3 py-1 ring-1 ring-koi-ink/15" onClick={() => window.confirm("Mark as manual (billed by Sulvatech, no limits)?") && act({ action: "set_manual", siteId: r.site_id })}>Manual</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className={cardCls}>
        <h2 className="font-medium">Domain requests</h2>
        {data.domainRequests.length === 0 ? <p className="mt-2 text-sm text-koi-ink/60">None.</p> : null}
        {data.domainRequests.map((dr) => (
          <div key={dr.id} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{dr.desired_name}</span>
            <select value={dr.status} onChange={(e) => act({ action: "domain", id: dr.id, status: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10">
              {["requested", "quoted", "paid", "active", "rejected"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1">renews
              <input type="date" defaultValue={dr.renews_at ?? ""} onBlur={(e) => e.target.value !== (dr.renews_at ?? "") && act({ action: "domain", id: dr.id, renews_at: e.target.value })} className="rounded-full px-2 py-1 ring-1 ring-koi-ink/10" />
            </label>
          </div>
        ))}
      </section>
    </div>
  );
}
