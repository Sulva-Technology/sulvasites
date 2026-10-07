"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, navPageHref } from "@/templates/shared/links";
import { ModeToggle } from "@/templates/shared/colorMode";
import { useT6 } from "../ctx";
import { IconArrow, IconBuilding, IconMail, IconMenu, IconPhone, IconPin } from "../icons";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

export default function T6Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile, mode, toggleMode } = useT6();
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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

  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    ...navPages.map((p) => ({ id: `p-${p.key}`, href: navPageHref(baseUrl, p), label: p.label, active: currentExtraKey === p.key })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  const hasTopbar = !!(profile.phone || profile.email || profile.address);

  return (
    <>
      {hasTopbar ? (
        <div className="t6-topbar">
          <div className="t6-container t6-topbar-inner">
            <div className="t6-topbar-group">
              {profile.address ? (
                <span className="t6-topbar-item t6-topbar-hide">
                  <IconPin size={15} />
                  {profile.address}
                </span>
              ) : null}
            </div>
            <div className="t6-topbar-group">
              {profile.phone ? (
                <a className="t6-topbar-item" href={buildTelLink(profile.phone)}>
                  <IconPhone size={15} />
                  {profile.phone}
                </a>
              ) : null}
              {profile.email ? (
                <a className="t6-topbar-item t6-topbar-hide" href={buildEmailLink(profile.email)}>
                  <IconMail size={15} />
                  {profile.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <header className="t6-header" data-scrolled={scrolled}>
        <div className="t6-container t6-header-inner">
          <Link href={`${baseUrl}/`} className="t6-brand" aria-label={profile.business_name}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={profile.business_name} />
            ) : (
              <span className="t6-brand-mark" aria-hidden="true">
                <IconBuilding size={20} />
              </span>
            )}
            <span className="t6-brand-name">
              <EditableText
                value={profile.business_name}
                onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                style={{ display: "inline" }}
              />
            </span>
          </Link>

          <nav className="t6-nav" aria-label="Main">
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

          <div className="t6-header-actions">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t6-round t6-mode" />
            <Link href={`${baseUrl}/contact`} className="t6-btn">
              Book a viewing
            </Link>
            <button type="button" className="t6-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="t6-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="t6-drawer-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="t6-drawer-panel">
            <div className="t6-drawer-top">
              <span className="t6-brand-name">{profile.business_name}</span>
              <button type="button" className="t6-round" aria-label="Close menu" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <nav className="t6-drawer-links" aria-label="Mobile">
              {items.map((it) => (
                <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
                  {it.label}
                  <IconArrow size={18} />
                </Link>
              ))}
            </nav>
            <div className="t6-drawer-foot">
              {profile.phone ? (
                <a className="t6-btn t6-btn-outline" href={buildTelLink(profile.phone)}>
                  <IconPhone size={16} /> {profile.phone}
                </a>
              ) : null}
              <Link className="t6-btn" href={`${baseUrl}/contact`} onClick={() => setOpen(false)}>
                Book a viewing
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
