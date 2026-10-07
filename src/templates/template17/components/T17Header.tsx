"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { navPageHref } from "@/templates/shared/links";
import { SUBSCRIBE_ID, useT17 } from "../ctx";
import { IconClose, IconMenu } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Logo image, else the name set as a serif wordmark. */
export function T17Wordmark({ logoUrl, name, editable }: { logoUrl: string | null; name: string; editable?: boolean }) {
  const editor = useInlineEditor();
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="t17-logo" src={logoUrl} alt={name} />;
  }
  return (
    <span className="t17-wordmark">
      {editable ? (
        <EditableText value={name} onCommit={(next) => editor?.updateProfileField?.("business_name", next)} style={{ display: "inline" }} />
      ) : (
        name
      )}
    </span>
  );
}

/**
 * A newspaper masthead: a thin top line (tagline, mode toggle, subscribe), the wordmark centred
 * (large on the home page), then a ruled nav row that sticks to the top as you scroll.
 * Phones get a full-height drawer (Esc closes, focus stays inside, returns to the burger).
 */
export default function T17Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile, mode, toggleMode, pageKind } = useT17();
  const editor = useInlineEditor();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
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
      const f = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
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
      <header id="top" className="t17-header" data-home={pageKind === "home"}>
        <div className="t17-topline">
          <div className="t17-container t17-topline-in">
            <span className="t17-topline-tag">
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  value={profile.tagline || ""}
                  placeholder="Tagline"
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                  style={{ display: "inline" }}
                />
              ) : (
                "Notes, essays and stories"
              )}
            </span>
            <span className="t17-topline-end">
              <ModeToggle mode={mode} onToggle={toggleMode} className="t17-icon-btn" />
              <a className="t17-topline-sub" href={`#${SUBSCRIBE_ID}`}>
                Subscribe
              </a>
            </span>
          </div>
        </div>

        <div className="t17-container t17-mast">
          <Link href={`${baseUrl}/`} className="t17-brand" aria-label={profile.business_name}>
            <T17Wordmark logoUrl={logoUrl} name={profile.business_name} editable />
          </Link>
        </div>
        <div ref={sentinelRef} className="t17-sentinel" aria-hidden="true" />
      </header>

      <div className="t17-navbar" data-stuck={stuck}>
        <div className="t17-container t17-navbar-in">
          <Link href={`${baseUrl}/`} className="t17-navbar-brand" aria-hidden={!stuck} tabIndex={stuck ? 0 : -1}>
            {profile.business_name}
          </Link>
          <nav className="t17-nav" aria-label="Main">
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
          <a className="t17-btn t17-btn-solid t17-btn-sm t17-navbar-cta" href={`#${SUBSCRIBE_ID}`}>
            Subscribe
          </a>
          <button
            ref={burgerRef}
            type="button"
            className="t17-icon-btn t17-burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <IconMenu size={20} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="t17-drawer-wrap">
          <div ref={drawerRef} className="t17-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="t17-drawer-top">
              <span className="t17-wordmark t17-wordmark-sm">{profile.business_name}</span>
              <button ref={closeRef} type="button" className="t17-icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                <IconClose size={20} />
              </button>
            </div>
            <nav className="t17-drawer-links" aria-label="Mobile">
              {items.map((it) => (
                <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined} onClick={() => setOpen(false)}>
                  {it.label}
                </Link>
              ))}
            </nav>
            <div className="t17-drawer-foot">
              <span>Appearance</span>
              <ModeToggle mode={mode} onToggle={toggleMode} className="t17-icon-btn" />
            </div>
            <a className="t17-btn t17-btn-solid t17-btn-block" href={`#${SUBSCRIBE_ID}`} onClick={() => setOpen(false)}>
              Subscribe
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
