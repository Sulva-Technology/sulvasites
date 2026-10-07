"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type NavLink = { href: string; label: string; tourId?: string };

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Centered floating glass pill nav. Links collapse into a "Menu" sheet below 640px. */
export function GlassNav({ brand, links, right }: { brand: ReactNode; links: NavLink[]; right?: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close the mobile sheet on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Darken once the page scrolls past the water header (where white glass stops being readable).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      ref={sheetRef}
      className={`koi-glass ${scrolled ? "koi-glass-dark" : ""} transition-colors duration-300 fixed left-1/2 top-4 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-full p-1.5 font-sans shadow-[0_8px_30px_-12px_rgba(10,15,31,.45)]`}
    >
      <div className="flex shrink-0 items-center gap-2 pl-2 pr-2 text-sm font-semibold tracking-tight text-white">
        {brand}
      </div>

      <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              data-tour={l.tourId}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${focus} ${
                active ? "bg-white/20 text-white" : "text-white/85 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {links.length > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="koi-nav-sheet"
          onClick={() => setOpen((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-sm text-white hover:bg-white/15 sm:hidden ${focus}`}
        >
          Menu
        </button>
      ) : null}

      {right ? <div className="flex shrink-0 items-center gap-1 pl-1">{right}</div> : null}

      {open ? (
        <div
          id="koi-nav-sheet"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-3xl bg-koi-ink/90 p-2 shadow-xl backdrop-blur sm:hidden"
        >
          <nav aria-label="Main (mobile)" className="flex flex-col">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-4 py-2.5 text-sm ${focus} ${active ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export default GlassNav;
