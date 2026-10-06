"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { siteScopedRedirect } from "@/lib/hostRouting";
import { resolveHostSite, type HostSite } from "@/lib/hostSite";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

const HostSiteContext = createContext<HostSite>({ kind: "platform" });

/** The site this address serves ({ kind: "platform" } on the main domain). */
export function useHostSite(): HostSite {
  return useContext(HostSiteContext);
}

/**
 * On a site's own address (<slug>.<platform> or a custom domain) the back office serves only that
 * site: any other /admin or /dashboard path redirects to it. On the platform domain it does nothing.
 * Children render only once the address is resolved, so the full admin never flashes on a site address.
 */
export default function HostSiteScope({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [hostSite, setHostSite] = useState<HostSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    resolveHostSite(supabaseBrowser())
      .then((v) => isMounted && setHostSite(v))
      .catch((e) => isMounted && setErr(formatSupabaseError(e)));
    return () => {
      isMounted = false;
    };
  }, []);

  const redirect = hostSite?.kind === "site" ? siteScopedRedirect(pathname, hostSite.siteId) : null;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (err) {
    return (
      <div className="m-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
    );
  }
  if (!hostSite || redirect) return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  if (hostSite.kind === "missing") {
    return (
      <div className="m-6 rounded border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <div className="font-semibold">No site at this address</div>
        <div className="mt-1">
          This address isn&apos;t linked to a site you can manage. Sign in on the main Sulva Sites address to see
          all your sites.
        </div>
      </div>
    );
  }

  return <HostSiteContext.Provider value={hostSite}>{children}</HostSiteContext.Provider>;
}
