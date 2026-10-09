import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { isPromoActive, promoEndLabel } from "@/lib/marketing/pricing";

const NAV = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/start", label: "Have us build it" },
];

export default function MarketingShell({ children }: { children: ReactNode }) {
  const promo = isPromoActive();
  return (
    <div className="min-h-screen bg-koi-paper font-sans text-koi-ink">
      {promo ? (
        <div className="bg-koi-ink px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
          Launch pricing: every plan at a third of the price, kept for life. Ends {promoEndLabel()}.{" "}
          <Link href="/pricing" className="underline underline-offset-2">See prices</Link>
        </div>
      ) : null}
      <header
        className="sticky top-0 z-40 border-b border-koi-ink/5 bg-koi-paper/80"
        style={{ backdropFilter: "blur(14px)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" aria-label="Sulva Sites home"><Logo /></Link>
          <nav className="order-last flex w-full gap-5 overflow-x-auto text-sm text-koi-ink/80 sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-koi-deep">{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-koi-ink/80 hover:text-koi-deep">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-koi-deep px-4 py-2 text-sm font-medium text-white hover:bg-koi-ink">
              Start free trial
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-koi-ink/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-koi-ink/70">Websites for Nigerian businesses, by Sulvatech.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/templates">Templates</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/start">Have us build it</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/signup">Start free trial</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-koi-ink/50">© {new Date().getFullYear()} Sulvatech</p>
      </footer>
    </div>
  );
}
