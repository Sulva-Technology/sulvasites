"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { planHref, useT11 } from "../ctx";
import { Confetti, IconArrow, IconClose, IconMenu, IconPhone, IconSparkle, Mesh } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Floating pill header: gradient sparkle mark, pill nav, mode toggle and a "Plan your event" button. */
export default function T11Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT11();
  const { baseUrl, navPages, profile, hours, mode, toggleMode } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const burger = burgerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      burger?.focus();
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

  const mark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={profile.business_name} />
  ) : (
    <span className="t11-brand-mark" aria-hidden="true">
      <IconSparkle size={18} />
    </span>
  );

  return (
    <>
      <header className="t11-header" data-scrolled={scrolled}>
        <div className="t11-container">
          <div className="t11-header-bar">
            <Link href={`${baseUrl}/`} className="t11-brand" aria-label={profile.business_name}>
              {mark}
              <span className="t11-brand-name">
                <EditableText
                  value={profile.business_name}
                  onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                  style={{ display: "inline" }}
                />
              </span>
            </Link>

            <nav className="t11-nav" aria-label="Main">
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

            <div className="t11-header-end">
              <ModeToggle mode={mode} onToggle={toggleMode} className="t11-icon-btn" />
              <a href={planHref(ctx)} className="t11-btn t11-btn-sm t11-hide-sm">
                Plan your event
              </a>
              <button
                ref={burgerRef}
                type="button"
                className="t11-icon-btn t11-burger"
                aria-label="Open menu"
                aria-expanded={open}
                onClick={() => setOpen(true)}
              >
                <IconMenu />
              </button>
            </div>
          </div>
        </div>
      </header>

      {open ? (
        <div className="t11-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <Mesh className="t11-mesh-drawer" />
          <Confetti set="band" />
          <div className="t11-drawer-top t11-container">
            <span className="t11-brand">
              {mark}
              <span className="t11-brand-name">{profile.business_name}</span>
            </span>
            <button ref={closeRef} type="button" className="t11-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <nav className="t11-drawer-links t11-container" aria-label="Mobile">
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
          <div className="t11-drawer-foot t11-container">
            {hours[0] ? <p className="t11-drawer-hours">{hours.slice(0, 2).join(" · ")}</p> : null}
            <a className="t11-btn t11-btn-peach t11-btn-block" href={planHref(ctx)} onClick={() => setOpen(false)}>
              Plan your event <IconArrow size={18} />
            </a>
            {profile.phone ? (
              <a className="t11-drawer-phone" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
