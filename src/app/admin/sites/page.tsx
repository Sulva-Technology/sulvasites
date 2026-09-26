"use client";

import Link from "next/link";
import { templateLabel } from "@/templates/meta";
import { useEffect, useMemo, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";

type SiteRow = {
  id: string;
  slug: string;
  template_key: string;
  status: string;
  created_at: string;
};

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseBrowser();

    async function load() {
      setIsLoading(true);
      setError(null);

      let authenticatedSupabase;
      try {
        // Ensure client is fully authenticated before making database call
        authenticatedSupabase = await getAuthenticatedClient();
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setError(err instanceof Error ? err.message : "Session error. Please log in again.");
        return;
      }

      const { data, error } = await authenticatedSupabase
        .from("sites")
        .select("id, slug, template_key, status, created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      setIsLoading(false);

      if (error) {
        setError(formatSupabaseError(error));
        return;
      }

      setSites((data ?? []) as SiteRow[]);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => s.slug.toLowerCase().includes(q));
  }, [sites, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Sites</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage SME sites.
          </p>
        </div>

        <Link
          href="/admin/sites/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Create Site
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by slug…"
          className="w-full max-w-md rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
        />
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={5}>
                    No sites found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="bg-white">
                    <td className="px-4 py-3 font-medium">{s.slug}</td>
                    <td className="px-4 py-3 text-gray-700">{templateLabel(s.template_key)}</td>
                    <td className="px-4 py-3 text-gray-700">{s.status}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/sites/${s.id}`}
                        className="text-sm font-medium text-black underline underline-offset-2"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

