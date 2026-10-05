/**
 * Builds the security notification sent when a shop's payout bank account or Paystack keys change.
 * Never includes key material or full account numbers. Relative imports only (unit-tested).
 */

export type PaymentChangeKind = "bank_changed" | "keys_set" | "keys_removed";

export type PaymentChangeNotice = {
  siteName: string;
  kind: PaymentChangeKind;
  actorLabel: "Sulvatech" | "A shop owner";
  actorEmail: string | null;
  bank: string | null;
  accountLast4: string | null;
  whenIso: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();

function summary(n: PaymentChangeNotice): string {
  if (n.kind === "bank_changed") {
    const acct = n.accountLast4 ? ` ending ${n.accountLast4}` : "";
    const bank = n.bank ? ` at ${oneLine(n.bank)}` : "";
    return `The payout bank account was changed to an account${acct}${bank}.`;
  }
  if (n.kind === "keys_set") return "The shop's own Paystack API keys were saved or replaced.";
  return "The shop's own Paystack API keys were removed.";
}

export function buildPaymentChangeEmail(n: PaymentChangeNotice): { subject: string; text: string; html: string } {
  const site = oneLine(n.siteName).slice(0, 120);
  const subject = `Payment settings changed - ${site}`.slice(0, 200);
  const by = n.actorEmail ? `${n.actorLabel} (${oneLine(n.actorEmail)})` : n.actorLabel;
  const lines = [
    `Payment settings changed on ${site}.`,
    "",
    summary(n),
    `Changed by: ${by}`,
    `When (UTC): ${n.whenIso}`,
    "",
    "If you did not expect this change, contact Sulvatech immediately and change your account password.",
  ];
  const text = lines.join("\n");
  const html =
    `<p>Payment settings changed on <strong>${esc(site)}</strong>.</p>` +
    `<p>${esc(summary(n))}</p>` +
    `<p>Changed by: ${esc(by)}<br>When (UTC): ${esc(n.whenIso)}</p>` +
    `<p><strong>If you did not expect this change, contact Sulvatech immediately and change your account password.</strong></p>`;
  return { subject, text, html };
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

/** Distinct, valid, lowercased recipient addresses (order kept). */
export function notificationRecipients(candidates: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const e = c.trim().toLowerCase();
    if (e.length > 254 || !EMAIL_RE.test(e) || out.includes(e)) continue;
    out.push(e);
  }
  return out;
}
