"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink, navPageHref } from "@/templates/shared/links";
import { quoteHref, useT12 } from "../ctx";
import { Hazard, IconArrow, IconClock, IconClose, IconHelmet, IconMenu, IconPhone } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/**
 * Charcoal utility bar (hours + phone) over a solid header: square orange hard-hat mark,
 * condensed uppercase nav, mode toggle and an orange "Get a quote" button. Phones get a
 * full-screen drawer (Esc closes, focus is trapped while open and returns to the burger).
 */
export default function T12Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT12();
  const { baseUrl, navPages, profile, hours, mode, toggleMode } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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
    ...navPages.map((p) => ({ id: `p-${p.key}`, href: navPageHref(baseUrl, p), label: p.label, active: currentExtraKey === p.key })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  const mark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={profile.business_name} />
  ) : (
    <span className="t12-brand-mark" aria-hidden="true">
      <IconHelmet size={20} />
    </span>
  );

  return (
    <>
      {hours[0] || profile.phone ? (
        <div className="t12-topbar">
          <div className="t12-container t12-topbar-inner">
            {hours[0] ? (
              <span className="t12-topbar-hours">
                <IconClock size={14} /> {hours[0]}
              </span>
            ) : (
              <span />
            )}
            {profile.phone ? (
              <a className="t12-topbar-phone" href={buildTelLink(profile.phone)}>
                <IconPhone size={14} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="t12-header" data-scrolled={scrolled}>
        <div className="t12-container t12-header-bar">
          <Link href={`${baseUrl}/`} className="t12-brand" aria-label={profile.business_name}>
            {mark}
            <span className="t12-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t12-nav" aria-label="Main">
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

          <div className="t12-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t12-icon-btn" />
            <a href={quoteHref(ctx)} className="t12-btn t12-btn-sm t12-hide-sm">
              Get a quote
            </a>
            <button
              ref={burgerRef}
              type="button"
              className="t12-icon-btn t12-burger"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <IconMenu />
            </button>
          </div>
        </div>
        <Hazard className="t12-header-stripe" />
      </header>

      {open ? (
        <div ref={drawerRef} className="t12-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <Hazard className="t12-drawer-stripe" />
          <div className="t12-drawer-top t12-container">
            <span className="t12-brand">
              {mark}
              <span className="t12-brand-name">{profile.business_name}</span>
            </span>
            <button ref={closeRef} type="button" className="t12-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <nav className="t12-drawer-links t12-container" aria-label="Mobile">
            {items.map((it, i) => (
              <Link
                key={it.id}
                href={it.href}
                data-active={it.active}
                aria-current={it.active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="t12-drawer-no" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{it.label}</span>
                <IconArrow size={22} />
              </Link>
            ))}
          </nav>
          <div className="t12-drawer-foot t12-container">
            {hours[0] ? <p className="t12-drawer-hours">{hours.slice(0, 2).join(" · ")}</p> : null}
            <a className="t12-btn t12-btn-block t12-btn-lg" href={quoteHref(ctx)} onClick={() => setOpen(false)}>
              Get a quote <IconArrow size={18} />
            </a>
            {profile.phone ? (
              <a className="t12-btn t12-btn-outline-light t12-btn-block" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
