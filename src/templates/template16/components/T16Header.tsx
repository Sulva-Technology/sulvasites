"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { joinHref, useT16 } from "../ctx";
import { IconArrow, IconChat, IconCircles, IconClose, IconMenu } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Logo (rounded square) or an interlocking-circles mark. */
export function T16Mark({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="t16-brand-logo" src={logoUrl} alt={name} />
  ) : (
    <span className="t16-brand-mark" aria-hidden="true">
      <IconCircles size={20} />
    </span>
  );
}

/**
 * Transparent at the top of the page; once scrolled it becomes a floating glass pill.
 * Logo and name, centred nav with an underline on the current page, mode toggle, WhatsApp and a
 * "Join" pill. Phones get a side drawer (Esc closes, focus is trapped and returns to the burger).
 */
export default function T16Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT16();
  const { baseUrl, navPages, profile, mode, toggleMode } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const burger = burgerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      // Keep Tab / Shift+Tab inside the drawer while it is open.
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      burger?.focus();
    };
  }, [open]);

  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    ...navPages.map((p) => ({ id: `p-${p.key}`, href: navPageHref(baseUrl, p), label: p.label, active: currentExtraKey === p.key })),
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  return (
    <>
      <header className="t16-header" data-scrolled={scrolled}>
        <div className="t16-header-pill">
          <Link href={`${baseUrl}/`} className="t16-brand" aria-label={profile.business_name}>
            <T16Mark logoUrl={logoUrl} name={profile.business_name} />
            <span className="t16-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t16-nav" aria-label="Main">
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

          <div className="t16-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t16-icon-btn" />
            {profile.whatsapp ? (
              <a className="t16-btn t16-btn-ghost t16-btn-sm t16-hide-md" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                <IconChat size={16} /> WhatsApp
              </a>
            ) : null}
            <a href={joinHref(ctx)} className="t16-btn t16-btn-solid t16-btn-sm t16-hide-sm">
              Join now
            </a>
            <button
              ref={burgerRef}
              type="button"
              className="t16-icon-btn t16-burger"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="t16-drawer-wrap">
          <button type="button" className="t16-drawer-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />
          <div ref={drawerRef} className="t16-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="t16-drawer-top">
              <span className="t16-brand">
                <T16Mark logoUrl={logoUrl} name={profile.business_name} />
                <span className="t16-brand-name">{profile.business_name}</span>
              </span>
              <button ref={closeRef} type="button" className="t16-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </div>
            <nav className="t16-drawer-links" aria-label="Mobile">
              {items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  data-active={it.active}
                  aria-current={it.active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </nav>
            <div className="t16-drawer-foot">
              <div className="t16-drawer-mode">
                <span>Appearance</span>
                <ModeToggle mode={mode} onToggle={toggleMode} className="t16-icon-btn" />
              </div>
              <a className="t16-btn t16-btn-solid t16-btn-lg t16-btn-block" href={joinHref(ctx)} onClick={() => setOpen(false)}>
                Become a member <IconArrow size={18} />
              </a>
              {profile.whatsapp ? (
                <a className="t16-btn t16-btn-wa t16-btn-lg t16-btn-block" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <IconChat size={16} /> Join via WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
