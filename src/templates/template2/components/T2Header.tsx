"use client";

import { navPageHref } from "@/templates/shared/links";
import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { useT2 } from "../ctx";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/**
 * Glossy-magazine header: nav split either side of a centred serif nameplate.
 * On the home page it floats over the cover photo in white, turning solid on scroll.
 */
export default function T2Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile, pageKind } = useT2();
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    ...navPages.map((p) => ({ id: `p-${p.key}`, href: navPageHref(baseUrl, p), label: p.label, active: currentExtraKey === p.key })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  const link = (it: NavItem) => (
    <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined}>
      {it.coreKey ? (
        <EditableText value={it.label} onCommit={(next) => saveNavLabel(it.coreKey!, next)} style={{ display: "inline" }} />
      ) : (
        it.label
      )}
    </Link>
  );

  return (
    <header className="t2-header" data-overlay={pageKind === "home" && !scrolled && !open} data-scrolled={scrolled}>
      <div className="t2-container t2-header-inner">
        <nav className="t2-nav t2-nav-left" aria-label="Main">
          {left.map(link)}
        </nav>

        <Link href={`${baseUrl}/`} className="t2-nameplate" aria-label={profile.business_name}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={profile.business_name} />
          ) : (
            <EditableText
              value={profile.business_name}
              onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
              style={{ display: "inline" }}
            />
          )}
        </Link>

        <nav className="t2-nav t2-nav-right" aria-label="More">
          {right.map(link)}
          <Link className="t2-nav-cta" href={`${baseUrl}/contact`}>
            Work with us
          </Link>
        </nav>

        <button
          type="button"
          className="t2-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      {open ? (
        <nav className="t2-menu" aria-label="Mobile">
          {items.map((it) => (
            <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
              {it.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
