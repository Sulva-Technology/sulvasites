import { NextResponse } from "next/server";

import { sendSalesEmail } from "@/lib/billing/email.server";
import { parseLeadInput } from "@/lib/marketing/leadInput";
import { clientIp } from "@/lib/shop/requestIp";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { supabaseService } from "@/lib/supabase/admin.server";
import { TEMPLATE_META } from "@/templates/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const limited = shopRateLimit(`leads:${clientIp(req)}`, 5, 60 * 60_000);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseLeadInput(body, TEMPLATE_META.map((t) => t.key));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const l = parsed.value;
  if (l.honeypot) return json({ ok: true });

  const { error } = await supabaseService().from("leads").insert({
    name: l.name, email: l.email, phone: l.phone, business: l.business, category: l.category,
    template_key: l.templateKey, tier: l.tier, domain: l.domain, notes: l.notes,
  });
  if (error) {
    console.error("[leads] insert failed", error.message);
    return json({ error: "Could not send your brief. Please try WhatsApp instead." }, 500);
  }
  await sendSalesEmail(
    `New done-for-you brief: ${l.business}`,
    [
      `Name: ${l.name}`, `Business: ${l.business}`, `Email: ${l.email}`, `Phone: ${l.phone}`,
      `Plan: ${l.tier ?? "-"}`, `Template: ${l.templateKey ?? "-"}`, `Domain wanted: ${l.domain ?? "-"}`,
      "", l.notes ?? "",
    ].join("\n"),
  );
  return json({ ok: true });
}
