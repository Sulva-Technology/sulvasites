"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";

import { addDomain, normalizeHostname, setDomainStatus, type DomainStatus } from "@/lib/domains";
import { formatSupabaseError } from "@/lib/supabase/formatError";

export type DomainRow = {
  id: string;
  hostname: string;
  status: DomainStatus;
  created_at: string;
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
  const [domainHostname, setDomainHostname] = useState("");
  const [isDomainSaving, setIsDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainActionLoadingId, setDomainActionLoadingId] = useState<string | null>(null);

  async function onAddDomain(e: FormEvent) {
    e.preventDefault();
    setDomainError(null);

    const normalized = normalizeHostname(domainHostname);
    if (!normalized) {
      setDomainError("Please enter a hostname.");
      return;
    }

    setIsDomainSaving(true);
    try {
      // addDomain already ensures authentication
      const created = await addDomain(siteId, normalized);
      setDomains((prev) => [created, ...prev]);
      setDomainHostname("");
    } catch (err: unknown) {
      const anyErr = err as { code?: string; message?: string };
      if (anyErr?.code === "23505") {
        setDomainError("Domain already exists.");
      } else {
        setDomainError(formatSupabaseError(err));
      }
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

  return (
    <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <h2 className="text-lg font-semibold tracking-tight text-koi-ink">Domains</h2>
      <p className="mt-1 text-sm text-koi-ink/60">Use either subdomains (recommended) or a custom domain.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-koi-paper p-4">
          <div className="text-sm font-semibold text-koi-ink">Subdomains (recommended)</div>
          <div className="mt-1 text-sm text-koi-ink/75">
            Your site is automatically available at:
          </div>
          <div className="mt-2 rounded bg-white px-3 py-2 font-mono text-sm ring-1 ring-koi-ink/10">
            https://{siteSlug}.{platformDomain}
          </div>
          <div className="mt-3 text-sm text-koi-ink/75">
            DNS setup (one-time, for your whole platform):
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-koi-ink/75">
            <li>
              Add <span className="font-mono">{platformDomain}</span> to your hosting provider (Vercel/Netlify) as a domain.
            </li>
            <li>
              Add wildcard <span className="font-mono">*.{platformDomain}</span> to the same project.
            </li>
            <li>
              In your DNS provider, point both the base and wildcard records to your host (Vercel/Netlify) so all subdomains resolve.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-koi-paper p-4">
          <div className="text-sm font-semibold text-koi-ink">Custom domain (per site)</div>
          <div className="mt-1 text-sm text-koi-ink/75">
            If a client has their own domain (e.g. <span className="font-mono">client.com</span>), add it below.
            After your DNS points to this app, mark it <b>Active</b>.
          </div>
          <div className="mt-2 text-xs text-koi-ink/55">
            This uses custom-domain routing (requests to <span className="font-mono">client.com</span> are routed to this site).
          </div>
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
              domains.map((d) => (
                <tr key={d.id}>
                  <td className="break-all px-3 py-3 font-mono sm:px-4">{d.hostname}</td>
                  <td className="px-3 py-3 sm:px-4">{d.status}</td>
                  <td className="hidden px-3 py-3 sm:px-4 text-koi-ink/75 sm:table-cell">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 sm:px-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {d.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => onSetDomainStatus(d.id, "active")}
                          disabled={domainActionLoadingId === d.id}
                          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-koi-ink shadow-sm ring-1 ring-koi-ink/10 hover:bg-koi-paper disabled:opacity-60"
                        >
                          {domainActionLoadingId === d.id ? "Working…" : "Mark Active"}
                        </button>
                      ) : null}
                      {d.status !== "blocked" ? (
                        <button
                          type="button"
                          onClick={() => onSetDomainStatus(d.id, "blocked")}
                          disabled={domainActionLoadingId === d.id}
                          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm ring-1 ring-koi-ink/10 hover:bg-koi-paper disabled:opacity-60"
                        >
                          {domainActionLoadingId === d.id ? "Working…" : "Block"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
