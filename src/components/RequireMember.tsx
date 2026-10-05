"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import type { SiteRole } from "@/lib/siteAccess";

export type MemberSite = {
  siteId: string;
  role: SiteRole;
  site: { id: string; slug: string; template_key: string; status: string };
  businessName: string;
};

export type MemberContextValue = {
  userId: string;
  email: string;
  isAdmin: boolean;
  memberships: MemberSite[];
};

const MemberContext = createContext<MemberContextValue | null>(null);

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used inside <RequireMember>.");
  return ctx;
}

type SiteJoin = { id: string; slug: string; template_key: string; status: string };
type MembershipRow = {
  site_id: string;
  role: SiteRole;
  sites: SiteJoin | SiteJoin[] | null;
};

/**
 * Client guard for the owner dashboard. Redirects to /login (no session) or
 * /change-password, and to /no-access when the user is neither a member nor an admin.
 * Sulvatech admins are let through (with no memberships) so they can view any site.
 */
export default function RequireMember({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [value, setValue] = useState<MemberContextValue | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let isMounted = true;

    async function run() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.replace("/login");
          return;
        }
        const user = sessionData.session.user;

        if (user.app_metadata?.must_change_password) {
          router.replace("/change-password");
          return;
        }

        const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
        if (adminError) throw adminError;

        const { data: rows, error: memberError } = await supabase
          .from("site_members")
          .select("site_id, role, sites(id, slug, template_key, status)")
          .eq("user_id", user.id);
        if (memberError) throw memberError;

        const parsed = ((rows ?? []) as unknown as MembershipRow[]).flatMap((r) => {
          const site = Array.isArray(r.sites) ? r.sites[0] : r.sites;
          return site ? [{ siteId: r.site_id, role: r.role, site }] : [];
        });

        const names = new Map<string, string>();
        if (parsed.length > 0) {
          const { data: profiles } = await supabase
            .from("business_profiles")
            .select("site_id, business_name")
            .in("site_id", parsed.map((p) => p.siteId));
          for (const p of profiles ?? []) {
            names.set(p.site_id as string, p.business_name as string);
          }
        }

        if (!isAdmin && parsed.length === 0) {
          router.replace("/no-access");
          return;
        }

        if (isMounted) {
          setValue({
            userId: user.id,
            email: user.email ?? "",
            isAdmin: Boolean(isAdmin),
            memberships: parsed.map((p) => ({
              ...p,
              businessName: names.get(p.siteId) || p.site.slug,
            })),
          });
        }
      } catch (e) {
        if (isMounted) setErr(formatSupabaseError(e));
      }
    }

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (err) {
    return (
      <div className="m-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {err}
      </div>
    );
  }

  if (!value) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}
