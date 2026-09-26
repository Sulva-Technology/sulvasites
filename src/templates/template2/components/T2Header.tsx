"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { buildEmailLink } from "@/templates/shared/links";
import { useT2 } from "../ctx";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

/** Newspaper masthead + sticky ruled nav bar (shows the name once the masthead scrolls away). */
export default function T2Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile } = useT2();
  const editor = useInlineEditor();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <div className="t2-topline">
        <div className="t2-container t2-topline-inner">
          <span>
            Est. · Vol. {new Date().getFullYear()}
          </span>
          <span>{profile.tagline || profile.address || "Independent studio"}</span>
          {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : <span />}
        </div>
      </div>

      <div className="t2-masthead">
        <div className="t2-container">
          <Link href={`${baseUrl}/`} aria-label={profile.business_name}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={profile.business_name} />
            ) : (
              <span className="t2-mast-name">
                <EditableText
                  value={profile.business_name}
                  onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
                  style={{ display: "inline" }}
                />
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="t2-navbar" data-scrolled={scrolled}>
        <div className="t2-container t2-navbar-inner">
          <Link href={`${baseUrl}/`} className="t2-nav-name" tabIndex={scrolled ? 0 : -1}>
            {profile.business_name}
          </Link>
          <nav className="t2-nav" aria-label="Main">
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
          <Link className="t2-nav-cta" href={`${baseUrl}/contact`}>
            Work with us
          </Link>
          <button
            type="button"
            className="t2-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "×" : "≡"}
          </button>
        </div>
        {open ? (
          <nav className="t2-menu" aria-label="Mobile">
            {items.map((it) => (
              <Link key={it.id} href={it.href} data-active={it.active} onClick={() => setOpen(false)}>
                {it.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}
