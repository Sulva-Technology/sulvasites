"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink, navPageHref } from "@/templates/shared/links";
import { enquireHref, useT15 } from "../ctx";
import { IconArrow, IconClose, IconMenu, IconPhone, IconWheel } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Logo (rounded) or a steering-wheel mark. */
export function T15Mark({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="t15-brand-logo" src={logoUrl} alt={name} />
  ) : (
    <span className="t15-brand-mark" aria-hidden="true">
      <IconWheel size={18} />
    </span>
  );
}

/**
 * Floating glass pill: round logo and name, centred nav, mode toggle and an "Enquire" pill.
 * It tightens once the page scrolls. Phones get a full-screen glass drawer (Esc closes,
 * focus is trapped while open and returns to the burger).
 */
export default function T15Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT15();
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

  return (
    <>
      <header className="t15-header" data-scrolled={scrolled}>
        <div className="t15-header-pill t15-glass">
          <Link href={`${baseUrl}/`} className="t15-brand" aria-label={profile.business_name}>
            <T15Mark logoUrl={logoUrl} name={profile.business_name} />
            <span className="t15-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t15-nav" aria-label="Main">
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

          <div className="t15-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t15-icon-btn" />
            <a href={enquireHref(ctx)} className="t15-btn t15-btn-solid t15-btn-sm t15-hide-sm">
              Enquire
            </a>
            <button
              ref={burgerRef}
              type="button"
              className="t15-icon-btn t15-burger"
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
        <div ref={drawerRef} className="t15-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="t15-drawer-top">
            <span className="t15-brand">
              <T15Mark logoUrl={logoUrl} name={profile.business_name} />
              <span className="t15-brand-name">{profile.business_name}</span>
            </span>
            <button ref={closeRef} type="button" className="t15-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <nav className="t15-drawer-links" aria-label="Mobile">
            {items.map((it) => (
              <Link
                key={it.id}
                href={it.href}
                data-active={it.active}
                aria-current={it.active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span>{it.label}</span>
                <IconArrow size={22} />
              </Link>
            ))}
          </nav>
          <div className="t15-drawer-foot">
            <a className="t15-btn t15-btn-solid t15-btn-lg t15-btn-block" href={enquireHref(ctx)} onClick={() => setOpen(false)}>
              Enquire <IconArrow size={18} />
            </a>
            {profile.phone ? (
              <a className="t15-btn t15-btn-glass t15-btn-lg t15-btn-block" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
