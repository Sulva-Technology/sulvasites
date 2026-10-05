"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type NavigatorWithGpc = Navigator & { globalPrivacyControl?: boolean };

// document.referrer only describes how the visitor arrived at the site, so it is sent once per page load
// (client-side navigations would otherwise repeat it on every page).
let referrerSent = false;

/**
 * Privacy-friendly page-view beacon for public sites. Renders nothing, sets no cookies or storage, and sends
 * one tiny POST per path change. Skipped when the visitor has Do-Not-Track or Global Privacy Control enabled.
 * Mounted only in the public site shells (never in admin previews).
 */
export default function InsightsBeacon({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    // window.location reflects the visible URL even when a host rewrite changed the internal route.
    const path = window.location.pathname || pathname;
    if (!path || last.current === path) return;
    last.current = path;

    const nav = navigator as NavigatorWithGpc;
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return;

    try {
      const referrer = referrerSent ? null : document.referrer || null;
      referrerSent = true;
      const body = JSON.stringify({ path, referrer });
      const url = `/api/sites/${siteId}/track`;
      // text/plain keeps this a simple request (no CORS preflight); the route parses the text as JSON.
      if (!navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) {
        void fetch(url, { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => {});
      }
    } catch {
      // Analytics must never affect the page.
    }
  }, [pathname, siteId]);

  return null;
}
