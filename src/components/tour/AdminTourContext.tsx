"use client";

import { useEffect, useState } from "react";

import { getAuthenticatedClient } from "@/lib/supabase/browser";

import { TourContextSync } from "./TourProvider";

/** Looks up the most recently created site once so site-scoped admin tour steps work from any admin page. */
export function AdminTourContext() {
  const [firstSiteId, setFirstSiteId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getAuthenticatedClient();
        const { data } = await supabase
          .from("sites")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1);
        const id = data?.[0]?.id;
        if (!cancelled && typeof id === "string") setFirstSiteId(id);
      } catch {
        // Tour just skips site steps.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <TourContextSync firstSiteId={firstSiteId} />;
}
