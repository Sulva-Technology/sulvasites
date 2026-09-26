"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { bookHref, useT5 } from "../ctx";
import { IconCalendar, IconInstagram, IconMenu } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

export default function T5Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT5();
  const { baseUrl, navPages, profile } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const instagram = typeof socials.instagram === "string" ? socials.instagram : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // The Book page is reached via the booking button, so it isn't repeated in the nav.
  const extra = navPages.filter((p) => p.key !== "book");
  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    ...extra.map((p) => ({ id: `p-${p.key}`, href: `${baseUrl}/p/${p.key}`, label: p.label, active: currentExtraKey === p.key })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  return (
    <>
      <div className="t5-announce">
        By appointment only · <Link href={bookHref(ctx)}>Reserve your spot</Link>
      </div>

      <header className="t5-header" data-scrolled={scrolled}>
        <div className="t5-container t5-header-inner">
          <nav className="t5-nav" aria-label="Main">
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

          <Link href={`${baseUrl}/`} className="t5-brand" aria-label={profile.business_name}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={profile.business_name} />
            ) : (
              <>
                <span className="t5-brand-name">
                  <EditableText
                    value={profile.business_name}
                    onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                    style={{ display: "inline" }}
                  />
                </span>
                <span className="t5-brand-sub">Beauty studio</span>
              </>
            )}
          </Link>

          <div className="t5-header-actions">
            {instagram ? (
              <a className="t5-icon-btn t5-ig" href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <IconInstagram />
              </a>
            ) : null}
            <Link className="t5-btn" href={bookHref(ctx)}>
              Book now
            </Link>
            <button type="button" className="t5-icon-btn t5-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="t5-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="t5-sheet-top">
            <span className="t5-brand-name">{profile.business_name}</span>
            <button type="button" className="t5-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <nav className="t5-sheet-links" aria-label="Mobile">
            {items.map((it) => (
              <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
                {it.label}
              </Link>
            ))}
          </nav>
          <Link className="t5-btn t5-btn-rose" href={bookHref(ctx)} onClick={() => setOpen(false)}>
            <IconCalendar /> Book an appointment
          </Link>
        </div>
      ) : null}

      <div className="t5-bookbar">
        <span>Ready for your appointment?</span>
        <Link className="t5-btn t5-btn-rose" href={bookHref(ctx)}>
          Book now
        </Link>
      </div>
    </>
  );
}
