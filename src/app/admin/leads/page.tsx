"use client";

import { useEffect, useState } from "react";

import { apiFetch, cardCls, Notice } from "@/components/shop-admin/common";
import { useShellHero } from "@/components/ui/AppShell";
import { PageHero } from "@/components/ui/PageHero";

type Lead = {
  id: string; name: string; email: string; phone: string; business: string; category: string | null;
  template_key: string | null; tier: string | null; domain: string | null; notes: string | null;
  status: "new" | "contacted" | "won" | "lost"; admin_notes: string | null; created_at: string;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useShellHero(<PageHero title="Done-for-you" accent="leads" subtitle="Briefs sent from the Have us build it page." />);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ leads: Lead[] }>("/api/admin/leads").then((r) => {
      if (cancelled) return;
      if (!r.ok) setError(r.data.error ?? "Could not load leads.");
      else setLeads(r.data.leads);
    });
    return () => { cancelled = true; };
  }, [version]);

  async function update(id: string, patch: Partial<Pick<Lead, "status" | "admin_notes">>) {
    const r = await apiFetch("/api/admin/leads", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
    if (!r.ok) setError(r.data.error ?? "Update failed.");
    else setVersion((v) => v + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {leads === null ? <p className="text-sm">Loading…</p> : leads.length === 0 ? <p className="text-sm">No leads yet.</p> : null}
      {leads?.map((l) => (
        <div key={l.id} className={cardCls}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{l.business} <span className="text-sm text-koi-ink/60">· {l.name}</span></p>
              <p className="text-sm text-koi-ink/70">
                <a href={`mailto:${l.email}`}>{l.email}</a> · <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}>{l.phone}</a>
              </p>
              <p className="text-xs text-koi-ink/60">
                {new Date(l.created_at).toLocaleString()} · plan {l.tier ?? "-"} · template {l.template_key ?? "-"} · domain {l.domain ?? "-"}
              </p>
            </div>
            <select value={l.status} onChange={(e) => update(l.id, { status: e.target.value as Lead["status"] })} className="rounded-full px-3 py-1 text-sm ring-1 ring-koi-ink/10">
              {["new", "contacted", "won", "lost"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {l.notes ? <p className="mt-3 whitespace-pre-wrap text-sm">{l.notes}</p> : null}
          <textarea
            defaultValue={l.admin_notes ?? ""}
            onBlur={(e) => e.target.value !== (l.admin_notes ?? "") && update(l.id, { admin_notes: e.target.value })}
            placeholder="Internal notes"
            rows={2}
            className="mt-3 w-full rounded-2xl px-3 py-2 text-sm ring-1 ring-koi-ink/10"
          />
        </div>
      ))}
    </div>
  );
}
