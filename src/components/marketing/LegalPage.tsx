import Link from "next/link";
import type { ReactNode } from "react";

import MarketingShell from "@/components/marketing/MarketingShell";

export const LEGAL_UPDATED = "17 October 2026";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP;

/** Shared frame for the Terms and Privacy pages. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 pt-14 text-koi-ink/80 [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-koi-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="text-4xl font-semibold tracking-tight text-koi-ink">{title}</h1>
        <p className="mt-2 text-sm text-koi-ink/50">Last updated {LEGAL_UPDATED}</p>
        {children}
        <h2>Contact us</h2>
        <p>
          Questions about this page? {SUPPORT_EMAIL ? <>Email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{WHATSAPP ? " or " : "."}</> : null}
          {WHATSAPP ? <>message us on <a className="underline" href={`https://wa.me/${WHATSAPP}`}>WhatsApp</a>.</> : null}
          {!SUPPORT_EMAIL && !WHATSAPP ? <>Use the contact options on <Link className="underline" href="/start">our Start page</Link>.</> : null}
        </p>
      </article>
    </MarketingShell>
  );
}
