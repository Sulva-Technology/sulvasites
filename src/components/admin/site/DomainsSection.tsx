"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";

import { apiFetch } from "@/components/shop-admin/common";
import { setDomainStatus, type DomainStatus } from "@/lib/domains";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import type { DnsRecord } from "@/lib/vercelDomains";

export type DomainRow = {
  id: string;
  hostname: string;
  status: DomainStatus;
  created_at: string;
};

/** Server's view of one domain (see customDomains.server.ts). */
type DomainState = {
  domain: DomainRow;
  vercel: boolean;
  live: boolean;
  records: DnsRecord[];
  message?: string;
};

export default function DomainsSection({
  siteId,
  siteSlug,
  platformDomain,
  domains,
  setDomains,
}: {
  siteId: string;
  siteSlug: string;
  platformDomain: string;
  domains: DomainRow[];
  setDomains: Dispatch<SetStateAction<DomainRow[]>>;
}) {
  const api = `/api/admin/sites/${encodeURIComponent(siteId)}/domains`;
  const [domainHostname, setDomainHostname] = useState("");
  const [isDomainSaving, setIsDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainActionLoadingId, setDomainActionLoadingId] = useState<string | null>(null);
  // Per-domain DNS state from Vercel; `manual` once the server says the Vercel API isn't configured.
  const [states, setStates] = useState<Record<string, DomainState>>({});
  const [manual, setManual] = useState(false);
  const autoChecked = useRef(new Set<string>());

  const applyState = useCallback(
    (s: DomainState) => {
      setStates((prev) => ({ ...prev, [s.domain.id]: s }));
      setDomains((prev) => prev.map((d) => (d.id === s.domain.id ? { ...d, status: s.domain.status } : d)));
      if (!s.vercel) setManual(true);
    },
    [setDomains],
  );

  const checkDomain = useCallback(
    async (domainId: string) => {
      setDomainError(null);
      setDomainActionLoadingId(domainId);
      try {
        const res = await apiFetch<DomainState>(api, { method: "PATCH", body: JSON.stringify({ domainId }) });
        if (!res.ok) throw new Error(res.data.error || "Could not check the domain.");
        applyState(res.data);
      } catch (err) {
        setDomainError(err instanceof Error ? err.message : String(err));
      } finally {
        setDomainActionLoadingId(null);
      }
    },
    [api, applyState],
  );

  // Pending domains: ask Vercel once on load, so records show and live ones flip to Active.
  useEffect(() => {
    for (const d of domains) {
      if (d.status !== "pending" || autoChecked.current.has(d.id)) continue;
      autoChecked.current.add(d.id);
      void checkDomain(d.id);
    }
  }, [domains, checkDomain]);

  async function onAddDomain(e: FormEvent) {
    e.preventDefault();
    setDomainError(null);
    if (!domainHostname.trim()) {
      setDomainError("Please enter a hostname.");
      return;
    }

    setIsDomainSaving(true);
    try {
      const res = await apiFetch<DomainState>(api, {
        method: "POST",
        body: JSON.stringify({ hostname: domainHostname }),
      });
      if (!res.ok) throw new Error(res.data.error || "Could not add the domain.");
      autoChecked.current.add(res.data.domain.id);
      setDomains((prev) => [res.data.domain, ...prev]);
      applyState(res.data);
      setDomainHostname("");
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDomainSaving(false);
    }
  }

  async function onSetDomainStatus(domainId: string, status: DomainStatus) {
    setDomainError(null);
    setDomainActionLoadingId(domainId);
    try {
      // setDomainStatus already ensures authentication
      const updated = await setDomainStatus(domainId, status);
      setDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, status: updated.status } : d)),
      );
    } catch (err) {
      setDomainError(formatSupabaseError(err));
    } finally {
      setDomainActionLoadingId(null);
    }
  }

  async function onUnblock(domainId: string) {
    await onSetDomainStatus(domainId, "pending");
    await checkDomain(domainId);
  }

  async function onRemove(d: DomainRow) {
    if (!window.confirm(`Remove ${d.hostname}? The site will stop answering on that domain.`)) return;
    setDomainError(null);
    setDomainActionLoadingId(d.id);
    try {
      const res = await apiFetch<{ ok?: boolean }>(api, { method: "DELETE", body: JSON.stringify({ domainId: d.id }) });
      if (!res.ok) throw new Error(res.data.error || "Could not remove the domain.");
      setDomains((prev) => prev.filter((x) => x.id !== d.id));
      setStates((prev) => {
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : String(err));
    } finally {
      setDomainActionLoadingId(null);
    }
  }

  const btn =
    "rounded bg-white px-3 py-1.5 text-sm font-medium shadow-sm ring-1 ring-koi-ink/10 hover:bg-koi-paper disabled:opacity-60";

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <h2 className="text-lg font-semibold tracking-tight text-koi-ink">Domains</h2>
      <p className="mt-1 text-sm text-koi-ink/60">Every site has a free address; clients can also bring their own domain.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-koi-paper p-4">
          <div className="text-sm font-semibold text-koi-ink">Platform address</div>
          <div className="mt-1 text-sm text-koi-ink/75">This site is always available at:</div>
          <div className="mt-2 break-all rounded bg-white px-3 py-2 font-mono text-sm ring-1 ring-koi-ink/10">
            https://{siteSlug}.{platformDomain}
          </div>
        </div>

        <div className="rounded-2xl bg-koi-paper p-4">
          <div className="text-sm font-semibold text-koi-ink">Custom domain</div>
          {manual ? (
            <div className="mt-1 text-sm text-koi-ink/75">
              Automatic setup is off (Vercel API not configured). Add the domain in the Vercel project&apos;s
              Domains settings too, then mark it <b>Active</b> once Vercel shows it as valid.
            </div>
          ) : (
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-koi-ink/75">
              <li>Add the client&apos;s domain below (e.g. <span className="font-mono">client.com</span>; www is included).</li>
              <li>The client adds the DNS records shown at their domain registrar.</li>
              <li>Press <b>Check DNS</b>. The domain goes <b>Active</b> by itself once it&apos;s pointing here, usually within an hour.</li>
            </ol>
          )}
        </div>
      </div>

      <form onSubmit={onAddDomain} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={domainHostname}
          onChange={(e) => setDomainHostname(e.target.value)}
          placeholder="kingsbakery.com"
          className="w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
        />
        <button
          type="submit"
          disabled={isDomainSaving}
          className="rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
        >
          {isDomainSaving ? "Adding…" : "Add domain"}
        </button>
      </form>

      {domainError ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {domainError}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-koi-ink/10">
        <table className="w-full table-auto">
          <thead className="bg-koi-paper text-left text-xs font-semibold text-koi-ink/75">
            <tr>
              <th className="px-3 py-3 sm:px-4">Hostname</th>
              <th className="px-3 py-3 sm:px-4">Status</th>
              <th className="hidden px-3 py-3 sm:px-4 sm:table-cell">Created</th>
              <th className="px-3 py-3 sm:px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-koi-ink/5 text-sm">
            {domains.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-koi-ink/60" colSpan={4}>
                  No domains yet.
                </td>
              </tr>
            ) : (
              domains.map((d) => {
                const s = states[d.id];
                const busy = domainActionLoadingId === d.id;
                const showRecords = s && s.records.length > 0 && !s.live && d.status !== "blocked";
                return (
                  <Fragment key={d.id}>
                    <tr>
                      <td className="break-all px-3 py-3 font-mono sm:px-4">{d.hostname}</td>
                      <td className="px-3 py-3 sm:px-4">
                        {d.status === "pending" && s?.vercel ? "waiting for DNS" : d.status}
                      </td>
                      <td className="hidden px-3 py-3 sm:px-4 text-koi-ink/75 sm:table-cell">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 sm:px-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {busy ? <span className="text-koi-ink/60">Working…</span> : null}
                          {!busy && d.status !== "blocked" && !manual ? (
                            <button type="button" onClick={() => checkDomain(d.id)} className={`${btn} text-koi-ink`}>
                              Check DNS
                            </button>
                          ) : null}
                          {!busy && manual && d.status !== "active" ? (
                            <button type="button" onClick={() => onSetDomainStatus(d.id, "active")} className={`${btn} text-koi-ink`}>
                              Mark Active
                            </button>
                          ) : null}
                          {!busy && d.status === "blocked" && !manual ? (
                            <button type="button" onClick={() => onUnblock(d.id)} className={`${btn} text-koi-ink`}>
                              Unblock
                            </button>
                          ) : null}
                          {!busy && d.status !== "blocked" ? (
                            <button type="button" onClick={() => onSetDomainStatus(d.id, "blocked")} className={`${btn} text-red-700`}>
                              Block
                            </button>
                          ) : null}
                          {!busy ? (
                            <button type="button" onClick={() => onRemove(d)} className={`${btn} text-red-700`}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {s?.message ? (
                      <tr>
                        <td colSpan={4} className="px-3 pb-3 text-xs text-koi-ink/60 sm:px-4">{s.message}</td>
                      </tr>
                    ) : null}
                    {s?.live && d.status === "active" ? (
                      <tr>
                        <td colSpan={4} className="px-3 pb-3 text-xs text-green-800 sm:px-4">
                          Live at <span className="font-mono">https://{d.hostname}</span>
                        </td>
                      </tr>
                    ) : null}
                    {showRecords ? (
                      <tr>
                        <td colSpan={4} className="bg-koi-paper/60 px-3 py-3 sm:px-4">
                          <div className="text-xs font-semibold text-koi-ink">
                            Add these records at the domain&apos;s DNS provider:
                          </div>
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full table-auto text-xs">
                              <thead className="text-left text-koi-ink/60">
                                <tr>
                                  <th className="py-1 pr-4">Type</th>
                                  <th className="py-1 pr-4">Name</th>
                                  <th className="py-1">Value</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-koi-ink">
                                {s.records.map((r) => (
                                  <tr key={`${r.type}-${r.name}-${r.value}`}>
                                    <td className="py-1 pr-4">{r.type}</td>
                                    <td className="py-1 pr-4">{r.name}</td>
                                    <td className="break-all py-1 select-all">{r.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 text-xs text-koi-ink/60">
                            Remove any other A/AAAA records on the same name. Changes can take up to a few hours to spread.
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
