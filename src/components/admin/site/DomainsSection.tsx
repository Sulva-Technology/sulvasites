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
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold">Domains</h2>
      <p className="mt-1 text-sm text-gray-600">Use either subdomains (recommended) or a custom domain.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900">Subdomains (recommended)</div>
          <div className="mt-1 text-sm text-gray-700">
            Your site is automatically available at:
          </div>
          <div className="mt-2 rounded bg-white px-3 py-2 font-mono text-sm ring-1 ring-gray-200">
            https://{siteSlug}.{platformDomain}
          </div>
          <div className="mt-3 text-sm text-gray-700">
            DNS setup (one-time, for your whole platform):
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
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

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900">Custom domain (per site)</div>
          <div className="mt-1 text-sm text-gray-700">
            If a client has their own domain (e.g. <span className="font-mono">client.com</span>), add it below.
            After your DNS points to this app, mark it <b>Active</b>.
          </div>
          <div className="mt-2 text-xs text-gray-500">
            This uses custom-domain routing (requests to <span className="font-mono">client.com</span> are routed to this site).
          </div>
        </div>
      </div>

      <form onSubmit={onAddDomain} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={domainHostname}
          onChange={(e) => setDomainHostname(e.target.value)}
          placeholder="kingsbakery.com"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={isDomainSaving}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isDomainSaving ? "Adding…" : "Add domain"}
        </button>
      </form>

      {domainError ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {domainError}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-gray-200">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3">Hostname</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {domains.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-600" colSpan={4}>
                  No domains yet.
                </td>
              </tr>
            ) : (
              domains.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-mono">{d.hostname}</td>
                  <td className="px-4 py-3">{d.status}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {d.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => onSetDomainStatus(d.id, "active")}
                          disabled={domainActionLoadingId === d.id}
                          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {domainActionLoadingId === d.id ? "Working…" : "Mark Active"}
                        </button>
                      ) : null}
                      {d.status !== "blocked" ? (
                        <button
                          type="button"
                          onClick={() => onSetDomainStatus(d.id, "blocked")}
                          disabled={domainActionLoadingId === d.id}
                          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
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
