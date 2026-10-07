"use client";

import { navPageHref } from "@/templates/shared/links";
import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { useT1 } from "../ctx";
import { IconArrow, IconMenu } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

export function T1Mark() {
  return (
    <span className="t1-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function T1Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile } = useT1();
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
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

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  return (
    <header className="t1-header" data-scrolled={scrolled}>
      <div className="t1-container t1-header-inner">
        <Link href={`${baseUrl}/`} className="t1-brand" aria-label={profile.business_name}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={profile.business_name} />
          ) : (
            <T1Mark />
          )}
          <span className="t1-brand-name">
            <EditableText
              value={profile.business_name}
              onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
              style={{ display: "inline" }}
            />
          </span>
        </Link>

        <nav className="t1-nav" aria-label="Main">
          {items.map((it) => (
            <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined}>
              {it.coreKey ? (
                <EditableText value={it.label} onCommit={(next) => saveNavLabel(it.coreKey!, next)} style={{ display: "inline" }} />
              ) : (
                it.label
              )}
            </Link>
          ))}
        </nav>

        <div className="t1-header-actions">
          <Link className="t1-btn t1-btn-ink" href={`${baseUrl}/contact`}>
            Book a consultation
          </Link>
          <button
            type="button"
            className="t1-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "×" : <IconMenu />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="t1-mobile" aria-label="Mobile">
          {items.map((it) => (
            <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
              {it.label}
              <IconArrow size={16} />
            </Link>
          ))}
          <Link className="t1-btn" href={`${baseUrl}/contact`} onClick={() => setOpen(false)}>
            Book a consultation
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
