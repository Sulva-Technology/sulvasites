"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import type { NavPage } from "@/templates/registry";
import { initials, pad2 } from "../edit";
import { T3ArrowIcon } from "../ui";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

export default function T3Header({
  businessName,
  logoUrl,
  currentPage,
  currentExtraKey,
  baseUrl,
  profile,
  navPages = [],
}: {
  businessName: string;
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
  baseUrl: string;
  profile?: { socials?: Record<string, unknown> | null; email?: string | null };
  navPages?: NavPage[];
}) {
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile?.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  // Home, About, [extra pages...], Contact
  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    ...navPages.map((p) => ({
      id: `p-${p.key}`,
      href: `${baseUrl}/p/${p.key}`,
      label: p.label,
      active: currentExtraKey === p.key,
    })),
    {
      id: "contact",
      coreKey: "contact",
      href: `${baseUrl}/contact`,
      label: navLabels.contact || "Contact",
      active: currentPage === "contact",
    },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  return (
    <header className="t3-header" data-scrolled={scrolled}>
      <div className="t3-container t3-header-inner">
        <Link href={`${baseUrl}/`} className="t3-brand" aria-label={businessName}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={businessName} />
          ) : (
            <span className="t3-monogram" aria-hidden="true">
              {initials(businessName)}
            </span>
          )}
          <span className="t3-brand-name">
            <EditableText
              value={businessName}
              onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
              style={{ display: "inline" }}
            />
          </span>
        </Link>

        <nav className="t3-nav" aria-label="Main">
          {items.map((it, i) => (
            <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined}>
              <sup>{pad2(i + 1)}</sup>
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

        <div className="t3-header-actions">
          <Link href={`${baseUrl}/contact`} className="t3-btn">
            Let&apos;s talk
            <span className="t3-arrow">
              <T3ArrowIcon size={14} />
            </span>
          </Link>
          <button
            type="button"
            className="t3-menu-btn"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="t3-overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="t3-overlay-top">
            <span className="t3-brand-name">{businessName}</span>
            <button type="button" className="t3-overlay-close" aria-label="Close menu" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <nav className="t3-overlay-links" aria-label="Mobile">
            {items.map((it, i) => (
              <Link key={it.id} href={it.href} onClick={() => setOpen(false)}>
                <small>{pad2(i + 1)}</small>
                {it.label}
              </Link>
            ))}
          </nav>
          {profile?.email ? <div className="t3-overlay-foot">{profile.email}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
