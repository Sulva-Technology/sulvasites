"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { shopHref, useT13 } from "../ctx";
import { IconArrow, IconBag, IconClose, IconMenu, IconPhone } from "../icons";
import { useFocusTrap } from "../shop/useFocusTrap";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

function MobileMenu({ items, onClose, logo }: { items: NavItem[]; onClose: () => void; logo: React.ReactNode }) {
  const { profile, shop, baseUrl } = useT13();
  const ref = useFocusTrap<HTMLDivElement>(onClose, "[data-autofocus]");
  return (
    <div ref={ref} className="t13-menu" role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1}>
      <div className="t13-menu-top t13-container">
        <span className="t13-brand">{logo}</span>
        <button type="button" className="t13-icon-btn" aria-label="Close menu" onClick={onClose} data-autofocus>
          <IconClose />
        </button>
      </div>
      <nav className="t13-menu-links t13-container" aria-label="Mobile">
        {items.map((it) => (
          <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined} onClick={onClose}>
            <span>{it.label}</span>
            <IconArrow size={20} />
          </Link>
        ))}
      </nav>
      <div className="t13-menu-foot t13-container">
        {shop ? (
          <Link className="t13-btn t13-btn-block" href={shopHref(baseUrl)} onClick={onClose}>
            Shop now <IconArrow size={16} />
          </Link>
        ) : null}
        {profile.phone ? (
          <a className="t13-btn t13-btn-ghost t13-btn-block" href={buildTelLink(profile.phone)}>
            <IconPhone size={16} /> {profile.phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Editorial header: nav left, the business name set large in Italiana in the centre, and the
 * mode toggle and shopping bag right. The bag opens the cart drawer; phones get a full-screen menu.
 */
export default function T13Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile, mode, toggleMode, shop, cart, openCart, pageKind } = useT13();
  const editor = useInlineEditor();
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const [scrolled, setScrolled] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onShop = pageKind === "shop";
  const hasShopPage = navPages.some((p) => p.key === "shop");
  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home" },
    // The "shop" preset page always leads to the storefront; with a live shop and no such page, add a Shop link.
    ...(shop && !hasShopPage ? [{ id: "shop", href: shopHref(baseUrl), label: "Shop", active: onShop }] : []),
    ...navPages.map((p) => ({
      id: `p-${p.key}`,
      href: p.key === "shop" && shop ? shopHref(baseUrl) : `${baseUrl}/p/${p.key}`,
      label: p.label,
      active: p.key === "shop" ? onShop : currentExtraKey === p.key,
    })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about" },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact" },
  ];

  const saveNavLabel = (key: PageKey, next: string) =>
    editor?.updateProfileField?.("socials", { ...socials, nav_labels: { ...navLabels, [key]: next } });

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={profile.business_name} />
  ) : (
    <span className="t13-brand-name">
      <EditableText
        value={profile.business_name}
        onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
        style={{ display: "inline" }}
      />
    </span>
  );

  return (
    <>
      <header className="t13-header" data-scrolled={scrolled}>
        <div className="t13-container t13-header-bar">
          <div className="t13-header-start">
            <button
              type="button"
              className="t13-icon-btn t13-burger"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <IconMenu />
            </button>
            <nav className="t13-nav" aria-label="Main">
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
          </div>

          <Link href={`${baseUrl}/`} className="t13-brand" aria-label={`${profile.business_name} home`}>
            {logo}
          </Link>

          <div className="t13-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t13-icon-btn" />
            {shop ? (
              <button
                type="button"
                className="t13-icon-btn t13-bag-btn"
                aria-haspopup="dialog"
                aria-label={`Open bag${cart.ready ? `, ${cart.count} ${cart.count === 1 ? "item" : "items"}` : ""}`}
                onClick={openCart}
              >
                <IconBag />
                {cart.ready && cart.count > 0 ? (
                  <span className="t13-bag-count" aria-hidden="true">
                    {cart.count > 99 ? "99+" : cart.count}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {open ? <MobileMenu items={items} onClose={closeMenu} logo={logo} /> : null}
    </>
  );
}
