"use client";

import { useState } from "react";

import { PLAN_INFO, TIERS } from "@/lib/marketing/pricing";
import { TEMPLATE_META } from "@/templates/meta";

const input = "w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-koi-ink/10 focus:outline-none focus:ring-2 focus:ring-koi-deep";
const WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP?.replace(/\D/g, "") || "";

export default function LeadForm({ template, plan }: { template?: string; plan?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  const wa = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Sulva Sites, I'd like you to build my website.")}` : null;

  if (state === "sent") {
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-koi-ink/5">
        <p className="text-2xl font-semibold">Thanks! We&apos;ve got your brief.</p>
        <p className="mt-2 text-koi-ink/70">We&apos;ll reach out within one working day.</p>
        {wa ? <a href={wa} className="mt-6 inline-block rounded-full bg-[#25D366] px-5 py-3 font-medium text-white">Chat on WhatsApp now</a> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-white/60 p-6 ring-1 ring-koi-ink/5 sm:grid-cols-2 sm:p-8">
      <input name="name" required placeholder="Your name" className={input} autoComplete="name" />
      <input name="business" required placeholder="Business name" className={input} autoComplete="organization" />
      <input name="email" type="email" required placeholder="Email" className={input} autoComplete="email" />
      <input name="phone" required placeholder="WhatsApp number" className={input} autoComplete="tel" />
      <input name="category" placeholder="What do you do? (e.g. bakery)" className={input} />
      <select name="tier" defaultValue={plan ?? "business"} className={input}>
        {TIERS.map((t) => <option key={t} value={t}>{PLAN_INFO[t].name} plan</option>)}
      </select>
      <select name="templateKey" defaultValue={template ?? ""} className={input}>
        <option value="">Help me choose a design</option>
        {TEMPLATE_META.map((t) => <option key={t.key} value={t.key}>{t.name} — {t.category}</option>)}
      </select>
      <input name="domain" placeholder="Domain you'd like (optional)" className={input} />
      <textarea name="notes" rows={4} placeholder="Anything else? Pages you need, colours, examples you like…" className={`${input} sm:col-span-2`} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {error ? <p className="text-sm text-koi-orange sm:col-span-2">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={state === "sending"} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Send my brief"}
        </button>
        {wa ? <a href={wa} className="text-sm text-koi-deep">or chat on WhatsApp</a> : null}
      </div>
    </form>
  );
}
