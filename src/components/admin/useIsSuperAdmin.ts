"use client";

import { useEffect, useState } from "react";

import { isSuperAdmin } from "@/lib/supabase/adminScope";
import { getAuthenticatedClient } from "@/lib/supabase/browser";

/** Whether the signed-in admin is a super admin. null while loading (and if the check fails). */
export function useIsSuperAdmin(): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await isSuperAdmin(await getAuthenticatedClient());
        if (isMounted) setValue(result);
      } catch {
        // Unknown: callers treat null as "not super" for anything sensitive.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  return value;
}
