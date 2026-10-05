import { isValidEmail } from "./input.ts";

export type NotifyInput = {
  siteName: string;
  kind: "enquiry" | "booking";
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  extra: Record<string, string>;
  dashboardUrl: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();

export function buildNotification(i: NotifyInput): { subject: string; text: string; html: string } {
  const label = i.kind === "booking" ? "booking request" : "enquiry";
  const site = oneLine(i.siteName);
  const subject = oneLine(`New ${label} from ${i.name} - ${site}`).slice(0, 200);
  const rows: Array<[string, string]> = [["Name", i.name]];
  if (i.email) rows.push(["Email", i.email]);
  if (i.phone) rows.push(["Phone", i.phone]);
  for (const [k, v] of Object.entries(i.extra)) rows.push([k.replace(/_/g, " "), v]);
  if (i.message) rows.push(["Message", i.message]);

  const text =
    `New ${label} on ${site}\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    (i.dashboardUrl ? `\n\nOpen your inbox: ${i.dashboardUrl}\n` : "\n");
  const html =
    `<p>New ${esc(label)} on <strong>${esc(site)}</strong></p>` +
    `<table cellpadding="6" style="border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#666;vertical-align:top;text-transform:capitalize">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`,
      )
      .join("") +
    `</table>` +
    (i.dashboardUrl && /^https?:\/\//.test(i.dashboardUrl) ? `<p><a href="${esc(i.dashboardUrl)}">Open your inbox</a></p>` : "");
  return { subject, text, html };
}

export function isNotifiable(c: { apiKey?: string | null; from?: string | null; to?: string | null }): boolean {
  return Boolean(c.apiKey && c.from && c.to && isValidEmail(c.to));
}

/** Sends via the Resend REST API. Returns true on success; never throws. */
export async function sendResend(
  c: { apiKey: string; from: string; to: string; replyTo?: string | null },
  mail: { subject: string; text: string; html: string },
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: c.from,
        to: [c.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        ...(c.replyTo && isValidEmail(c.replyTo) ? { reply_to: c.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
