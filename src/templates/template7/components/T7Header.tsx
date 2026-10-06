"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { reserveHref, useT7 } from "../ctx";
import { IconArrow, IconClose, IconCutlery, IconMenu, IconPhone } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Single-row masthead: wordmark left, nav, reserve. Floats over the home hero until scrolled. */
export default function T7Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const ctx = useT7();
  const { baseUrl, navPages, profile, hours, mode, toggleMode } = ctx;
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
    document.body.style.overflow = "hidden";
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

  return (
    <>
      <header className="t7-header" data-scrolled={scrolled}>
        <div className="t7-container t7-mast">
          <Link href={`${baseUrl}/`} className="t7-brand" aria-label={profile.business_name}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={profile.business_name} />
            ) : (
              <span className="t7-brand-mark" aria-hidden="true">
                <IconCutlery size={16} />
              </span>
            )}
            <span className="t7-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t7-nav" aria-label="Main">
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

          <div className="t7-mast-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t7-round" />
            <a href={reserveHref(ctx)} className="t7-btn t7-btn-sm t7-hide-sm">
              Reserve a table
            </a>
            <button
              type="button"
              className="t7-round t7-burger"
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
        <div className="t7-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="t7-drawer-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="t7-drawer-panel">
            <div className="t7-drawer-top">
              <span className="t7-brand-name">{profile.business_name}</span>
              <button type="button" className="t7-round" aria-label="Close menu" onClick={() => setOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>
            <nav className="t7-drawer-links" aria-label="Mobile">
              {items.map((it, i) => (
                <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  {it.label}
                </Link>
              ))}
            </nav>
            {hours.length ? (
              <div className="t7-drawer-hours">
                <span className="t7-eyebrow">Opening hours</span>
                {hours.slice(0, 4).map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            ) : null}
            <div className="t7-drawer-foot">
              <a className="t7-btn" href={reserveHref(ctx)} onClick={() => setOpen(false)}>
                Reserve a table <IconArrow size={16} />
              </a>
              {profile.phone ? (
                <a className="t7-btn t7-btn-ghost" href={buildTelLink(profile.phone)}>
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
