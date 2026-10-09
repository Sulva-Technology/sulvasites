import { supabaseBrowser } from "@/lib/supabase/browser";

/** Browser side: tell search engines a site changed. Never throws and never blocks the caller. */
export function notifySearchEngines(siteId: string): void {
  void (async () => {
    try {
      const { data } = await supabaseBrowser().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch(`/api/sites/${encodeURIComponent(siteId)}/search-ping`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      });
    } catch {
      // The daily cron catches anything a failed ping missed.
    }
  })();
}
