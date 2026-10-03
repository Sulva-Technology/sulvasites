"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { pad2 } from "@/templates/shared/edit";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { joinHref, useT9 } from "../ctx";
import { IconArrow, IconBolt, IconClose, IconMenu, IconPhone } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Black sticky bar: wordmark, uppercase nav, mode toggle and a red "Start free trial" button. */
export default function T9Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT9();
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
    <span className="t9-brand-mark" aria-hidden="true">
      <IconBolt size={16} />
    </span>
  );

  return (
    <>
      <header className="t9-header" data-scrolled={scrolled}>
        <div className="t9-container t9-header-inner">
          <Link href={`${baseUrl}/`} className="t9-brand" aria-label={profile.business_name}>
            {mark}
            <span className="t9-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t9-nav" aria-label="Main">
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

          <div className="t9-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t9-icon-btn" />
            <a href={joinHref(ctx)} className="t9-btn t9-btn-sm t9-hide-sm">
              Start free trial
            </a>
            <button
              ref={burgerRef}
              type="button"
              className="t9-icon-btn t9-burger"
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
        <div className="t9-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="t9-drawer-top t9-container">
            <span className="t9-brand">
              {mark}
              <span className="t9-brand-name">{profile.business_name}</span>
            </span>
            <button ref={closeRef} type="button" className="t9-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <nav className="t9-drawer-links t9-container" aria-label="Mobile">
            {items.map((it, i) => (
              <Link
                key={it.id}
                href={it.href}
                data-active={it.active}
                aria-current={it.active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <small aria-hidden="true">{pad2(i + 1)}</small>
                <span>{it.label}</span>
              </Link>
            ))}
          </nav>
          <div className="t9-drawer-foot t9-container">
            {hours[0] ? <p className="t9-drawer-hours">{hours.slice(0, 2).join(" · ")}</p> : null}
            <a className="t9-btn t9-btn-block" href={joinHref(ctx)} onClick={() => setOpen(false)}>
              Start free trial <IconArrow size={18} />
            </a>
            {profile.phone ? (
              <a className="t9-btn t9-btn-outline t9-btn-block" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
