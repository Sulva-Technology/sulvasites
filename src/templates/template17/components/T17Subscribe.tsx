"use client";

import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";
import { IconArrow } from "../icons";

/**
 * Name + email signup. Sends to the site's inbox as a "subscribe" message, so the owner sees each
 * new reader alongside other enquiries. `tone="dark"` for the footer band.
 */
export default function T17Subscribe({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  const inbox = useInboxForm();
  return (
    <form className="t17-sub" data-tone={tone} data-compact={compact} onSubmit={inbox.onSubmit}>
      <InboxHoneypot />
      <input type="hidden" name="subject" value="Newsletter signup" />
      <input type="hidden" name="message" value="Please add me to the mailing list." />
      <div className="t17-sub-row">
        <label className="t17-sub-field">
          <span className="t17-sr">Your name</span>
          <input name="name" autoComplete="name" required placeholder="Your name" />
        </label>
        <label className="t17-sub-field t17-sub-email">
          <span className="t17-sr">Email address</span>
          <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </label>
        <button type="submit" className={`t17-btn ${tone === "dark" ? "t17-btn-paper" : "t17-btn-solid"}`} disabled={inbox.sending}>
          Subscribe <IconArrow size={16} />
        </button>
      </div>
      <InboxStatus state={inbox.state} />
    </form>
  );
}
