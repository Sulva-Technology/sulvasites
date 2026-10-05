"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [notAdminUserId, setNotAdminUserId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let isMounted = true;

    async function run() {
      setIsChecking(true);
      setErr(null);
      setNotAdminUserId(null);

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.replace("/login");
          return;
        }

        if (sessionData.session.user.app_metadata?.must_change_password) {
          router.replace("/change-password");
          return;
        }

        const { data: adminData, error: adminError } = await supabase.rpc(
          "is_admin",
        );
        if (adminError) {
          setErr(formatSupabaseError(adminError));
          return;
        }

        if (!adminData) {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id ?? null;
          if (userId) {
            // Site owners/staff are not admins: send them to their dashboard instead of an error.
            const { count } = await supabase
              .from("site_members")
              .select("site_id", { count: "exact", head: true })
              .eq("user_id", userId);
            if ((count ?? 0) > 0) {
              setIsRedirecting(true);
              router.replace("/dashboard");
              return;
            }
          }
          setNotAdminUserId(userId);
          return;
        }
      } catch (e) {
        setErr(formatSupabaseError(e));
        return;
      } finally {
        if (isMounted) setIsChecking(false);
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

  if (isChecking || isRedirecting) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }

  if (err) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {err}
      </div>
    );
  }

  if (notAdminUserId) {
    return (
      <div className="space-y-4 rounded border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <div className="font-semibold">Admin access required</div>
        <div>
          Your account is logged in, but it is <b>not</b> listed in{" "}
          <code className="font-mono">public.admin_users</code>, so database
          writes are blocked by RLS.
        </div>
        <div>
          <div className="font-medium">Your user id</div>
          <code className="block break-all rounded bg-white/70 p-2 font-mono text-xs ring-1 ring-amber-200">
            {notAdminUserId}
          </code>
        </div>
        <div className="text-xs">
          Fix: add this UUID to <code className="font-mono">admin_users</code>{" "}
          in Supabase SQL Editor (see <code className="font-mono">supabase/admin/add_current_user_as_admin.sql</code>).
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

