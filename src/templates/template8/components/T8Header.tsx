"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { bookHref, cityOf, directionsHref, useT8 } from "../ctx";
import { IconArrow, IconClock, IconClose, IconCross, IconMenu, IconPhone, IconPin } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Mint utility bar (hours · phone · address) above a white sticky nav with a booking button. */
export default function T8Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT8();
  const { baseUrl, navPages, profile, hours, mode, toggleMode } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const city = cityOf(profile.address);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    ...navPages.map((p) => ({ id: `p-${p.key}`, href: `${baseUrl}/p/${p.key}`, label: p.label, active: currentExtraKey === p.key })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  const hasTopbar = !!(hours[0] || profile.phone || profile.address);

  const brand = (
    <>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={profile.business_name} />
      ) : (
        <span className="t8-brand-mark" aria-hidden="true">
          <IconCross size={16} />
        </span>
      )}
    </>
  );

  return (
    <>
      {hasTopbar ? (
        <div className="t8-topbar">
          <div className="t8-container t8-topbar-inner">
            {hours[0] ? (
              <span className="t8-topbar-item">
                <IconClock size={15} />
                <span>{hours[0]}</span>
              </span>
            ) : null}
            {profile.address ? (
              <a className="t8-topbar-item t8-hide-sm" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                <IconPin size={15} />
                <span>{city || profile.address}</span>
              </a>
            ) : null}
            {profile.phone ? (
              <a className="t8-topbar-item t8-topbar-phone" href={buildTelLink(profile.phone)}>
                <IconPhone size={15} />
                <span>{profile.phone}</span>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="t8-header" data-scrolled={scrolled}>
        <div className="t8-container t8-header-inner">
          <Link href={`${baseUrl}/`} className="t8-brand" aria-label={profile.business_name}>
            {brand}
            <span className="t8-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t8-nav" aria-label="Main">
            {items.map((it) => (
              <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined}>
                {it.coreKey ? (
                  <EditableText
                    value={it.label}
                    onCommit={(next) => saveNavLabel(it.coreKey!, next)}
                    style={{ display: "inline" }}
                  />
                ) : (
                  it.label
                )}
              </Link>
            ))}
          </nav>

          <div className="t8-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t8-icon-btn" />
            <a href={bookHref(ctx)} className="t8-btn t8-btn-sm t8-hide-sm">
              Book appointment
            </a>
            <button
              type="button"
              className="t8-icon-btn t8-burger"
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
        <div className="t8-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="t8-drawer-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="t8-drawer-panel">
            <div className="t8-drawer-top">
              <span className="t8-brand">
                {brand}
                <span className="t8-brand-name">{profile.business_name}</span>
              </span>
              <button ref={closeRef} type="button" className="t8-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>
            <nav className="t8-drawer-links" aria-label="Mobile">
              {items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  data-active={it.active}
                  aria-current={it.active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {it.label}
                  <IconArrow size={16} />
                </Link>
              ))}
            </nav>
            {hours.length ? (
              <div className="t8-drawer-hours">
                <span className="t8-eyebrow">
                  <IconClock size={14} /> Opening hours
                </span>
                {hours.slice(0, 4).map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            ) : null}
            <div className="t8-drawer-foot">
              <a className="t8-btn t8-btn-block" href={bookHref(ctx)} onClick={() => setOpen(false)}>
                Book appointment <IconArrow size={16} />
              </a>
              {profile.phone ? (
                <a className="t8-btn t8-btn-ghost t8-btn-block" href={buildTelLink(profile.phone)}>
                  <IconPhone size={16} /> {profile.phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
