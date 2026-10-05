"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { GlassNav } from "./GlassNav";
import type { NavLink } from "./GlassNav";
import { WaterBackdrop } from "./WaterBackdrop";

type SetHero = (node: ReactNode) => void;

const ShellHeroContext = createContext<SetHero | null>(null);

/**
 * Lets a page put its own hero (usually a <PageHero>) into the shell's water band
 * without the layout knowing page data. Cleared when the page unmounts.
 */
export function useShellHero(node: ReactNode) {
  const setHero = useContext(ShellHeroContext);
  useEffect(() => {
    setHero?.(node);
  }, [node, setHero]);
  useEffect(() => {
    return () => setHero?.(null);
  }, [setHero]);
}

/** Component form of useShellHero, usable from server-component pages. Renders nothing. */
export function ShellHero({ children }: { children: ReactNode }) {
  useShellHero(children);
  return null;
}

function Brand({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white">
        <span className="h-2.5 w-2.5 rounded-full bg-koi-orange" />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function AppShell({
  brand,
  brandHref = "/",
  links,
  right,
  hero,
  bareRoutes,
  children,
}: {
  brand: string;
  brandHref?: string;
  links: NavLink[];
  right?: ReactNode;
  hero?: ReactNode;
  /** Regex source; matching routes (full-screen editors/previews) render without the shell. */
  bareRoutes?: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [pageHero, setPageHeroState] = useState<ReactNode>(null);
  const setPageHero = useCallback<SetHero>((node) => setPageHeroState(node), []);
  const shown = pageHero ?? hero ?? null;

  if (bareRoutes && new RegExp(bareRoutes).test(pathname)) {
    return <ShellHeroContext.Provider value={setPageHero}>{children}</ShellHeroContext.Provider>;
  }

  return (
    <ShellHeroContext.Provider value={setPageHero}>
      <div className="koi-app min-h-screen">
        <header className="relative flex min-h-[340px] flex-col justify-end sm:min-h-[420px]">
          <WaterBackdrop koi />
          <GlassNav brand={<Brand label={brand} href={brandHref} />} links={links} right={right} />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-32 pt-28 sm:px-6">{shown}</div>
        </header>
        <main className="relative mx-auto -mt-24 max-w-6xl px-4 pb-16 sm:px-6">{children}</main>
      </div>
    </ShellHeroContext.Provider>
  );
}

export default AppShell;
