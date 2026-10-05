"use client";

import { createContext, useCallback, useContext, useState, type FormEvent, type ReactNode } from "react";

import { buildInboxPayload } from "@/lib/inbox/clientPayload";

/** Provides the site id to template contact forms (set once in PublicSitePage). Absent in previews. */
const InboxSiteContext = createContext<string | null>(null);

export function InboxSiteProvider({ siteId, children }: { siteId: string; children: ReactNode }) {
  return <InboxSiteContext.Provider value={siteId}>{children}</InboxSiteContext.Provider>;
}

type Phase = "idle" | "sending" | "sent" | "error";
export type InboxFormState = { phase: Phase; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENT = "Thank you. We have received your message and will get back to you soon.";
const FAILED = "Sorry, we couldn't send your message. Please call or email us directly.";
const PREVIEW = "This is a preview, so messages are not sent.";

/**
 * Shared contact/booking form handler for all templates. Reads every named field from the form,
 * posts to /api/sites/[siteId]/inbox and exposes `state` for <InboxStatus> and `sending` for the button.
 */
export function useInboxForm() {
  const siteId = useContext(InboxSiteContext);
  const [state, setState] = useState<InboxFormState>({ phase: "idle", message: "" });

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (state.phase === "sending") return;
      if (!siteId || !UUID_RE.test(siteId)) {
        setState({ phase: "error", message: PREVIEW });
        return;
      }
      const entries: Array<[string, string]> = [];
      new FormData(form).forEach((v, k) => {
        if (typeof v === "string") entries.push([k, v]);
      });
      setState({ phase: "sending", message: "Sending..." });
      try {
        const res = await fetch(`/api/sites/${siteId}/inbox`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildInboxPayload(entries, window.location.pathname)),
        });
        if (res.ok) {
          form.reset();
          setState({ phase: "sent", message: SENT });
          return;
        }
        let msg = FAILED;
        if (res.status === 400 || res.status === 429) {
          const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
          if (typeof data?.error === "string" && data.error) msg = data.error;
        }
        setState({ phase: "error", message: msg });
      } catch {
        setState({ phase: "error", message: FAILED });
      }
    },
    [siteId, state.phase],
  );

  return { onSubmit, state, sending: state.phase === "sending" };
}

/** Hidden bot trap. Real visitors never see or tab to it; bots that fill every field are dropped server-side. */
export function InboxHoneypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Live-region status line for the form (success or error). Renders nothing when idle. */
export function InboxStatus({ state }: { state: InboxFormState }) {
  if (state.phase === "idle") return <div aria-live="polite" />;
  const isError = state.phase === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, fontWeight: 500, color: isError ? "#b42318" : "inherit" }}
    >
      {state.message}
    </p>
  );
}
