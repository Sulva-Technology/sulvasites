// Which lifecycle emails a subscription is due, and their copy. Pure: relative imports only.
// Keys stored in site_subscriptions.emails_sent; some carry a date suffix so they repeat per pause/grace window.
import { DAY_MS, daysLeft, type SubSnapshot } from "./subscriptionState.ts";

export type LifecycleKind = "welcome" | "trial_ending" | "paused" | "archive_warning" | "payment_failed";

const KINDS: readonly LifecycleKind[] = ["welcome", "trial_ending", "paused", "archive_warning", "payment_failed"];

export const TRIAL_ENDING_NOTICE_DAYS = 2;
export const ARCHIVE_WARNING_AFTER_PAUSE_DAYS = 21;

export function emailsDue(s: SubSnapshot & { emails_sent: string[] }, now: number): string[] {
  const due: string[] = [];
  if (s.status === "trialing" && s.trial_ends_at) {
    const left = Date.parse(s.trial_ends_at) - now;
    if (left > 0 && left <= TRIAL_ENDING_NOTICE_DAYS * DAY_MS) due.push("trial_ending");
  }
  if (s.status === "paused" && s.paused_at) {
    const day = s.paused_at.slice(0, 10);
    due.push(`paused:${day}`);
    if (now - Date.parse(s.paused_at) >= ARCHIVE_WARNING_AFTER_PAUSE_DAYS * DAY_MS) due.push(`archive_warning:${day}`);
  }
  if (s.status === "past_due" && s.grace_ends_at) due.push(`payment_failed:${s.grace_ends_at.slice(0, 10)}`);
  return due.filter((k) => !s.emails_sent.includes(k));
}

export function emailKind(key: string): LifecycleKind | null {
  const k = key.split(":")[0] as LifecycleKind;
  return KINDS.includes(k) ? k : null;
}

export type LifecycleContext = { businessName: string; siteUrl: string; billingUrl: string; daysLeft: number };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function buildLifecycleEmail(kind: LifecycleKind, c: LifecycleContext): { subject: string; text: string; html: string } {
  const name = c.businessName.replace(/[\r\n]+/g, " ").trim() || "your site";
  const days = `${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;
  const copy: Record<LifecycleKind, { subject: string; lines: string[]; cta: string; url: string }> = {
    welcome: {
      subject: `${name} is live — your 7-day free trial has started`,
      lines: [`${name} is live at ${c.siteUrl}.`, "You have 7 days free to make it yours. No card needed until you decide to keep it."],
      cta: "Open your dashboard",
      url: c.billingUrl.replace(/\/billing$/, ""),
    },
    trial_ending: {
      subject: `${days} left on your free trial for ${name}`,
      lines: [`${name}: your free trial ends in ${days}.`, "Add a card now to keep your site live. Any trial days left are added to your first month."],
      cta: "Keep my site live",
      url: c.billingUrl,
    },
    paused: {
      subject: `${name} is paused`,
      lines: [`${name} is paused, so visitors see a 'temporarily unavailable' page.`, "Everything you built is saved. Pick a plan to bring it back instantly."],
      cta: "Reactivate my site",
      url: c.billingUrl,
    },
    archive_warning: {
      subject: `${name} will be archived in 9 days`,
      lines: [`${name} has been paused for three weeks.`, "In 9 days it will be archived. Reactivate before then to keep everything as it is."],
      cta: "Reactivate my site",
      url: c.billingUrl,
    },
    payment_failed: {
      subject: `We couldn't charge your card for ${name}`,
      lines: [`${name}: your latest payment didn't go through.`, "Your site stays live for 3 more days. Update your card to avoid a pause."],
      cta: "Update my card",
      url: c.billingUrl,
    },
  };
  const m = copy[kind];
  const text = `${m.lines.join("\n\n")}\n\n${m.cta}: ${m.url}\n\n— Sulva Sites\n`;
  const html =
    m.lines.map((l) => `<p>${esc(l)}</p>`).join("") +
    `<p><a href="${esc(m.url)}" style="display:inline-block;background:#0a4fe0;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${esc(m.cta)}</a></p>` +
    `<p style="color:#667">— Sulva Sites</p>`;
  return { subject: m.subject, text, html };
}
