"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { PageKey } from "@/lib/pageSchema";
import { formatNaira } from "@/lib/shop/money";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildTelLink } from "@/templates/shared/links";
import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconBag, IconChevronDown, IconClose, IconGrid, IconMenu, IconPhone, IconSearch, IconTag } from "../icons";
import { useBag } from "../shop/useBag";
import { dealProducts } from "../shop/helpers";
import { useFocusTrap } from "../shop/useFocusTrap";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey };

function useCategoryLinks() {
  const { shop, baseUrl } = useT14();
  if (!shop) return { cats: [], deals: 0 };
  const counts = new Map<string, number>();
  for (const p of shop.products) if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  const cats = [...shop.categories]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, name: c.name, href: `${baseUrl}/shop/c/${c.slug}`, count: counts.get(c.id) ?? 0 }));
  return { cats, deals: dealProducts(shop).length };
}

function MobileMenu({ items, onClose, logo }: { items: NavItem[]; onClose: () => void; logo: React.ReactNode }) {
  const { profile, shop, baseUrl } = useT14();
  const { cats } = useCategoryLinks();
  const ref = useFocusTrap<HTMLDivElement>(onClose, "[data-autofocus]");
  return (
    <div ref={ref} className="t14-menu" role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1}>
      <div className="t14-menu-top t14-container">
        <span className="t14-brand">{logo}</span>
        <button type="button" className="t14-icon-btn" aria-label="Close menu" onClick={onClose} data-autofocus>
          <IconClose />
        </button>
      </div>
      <nav className="t14-menu-links t14-container" aria-label="Mobile">
        {items.map((it) => (
          <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined} onClick={onClose}>
            <span>{it.label}</span>
            <IconArrow size={18} />
          </Link>
        ))}
        {cats.length > 0 ? (
          <>
            <p className="t14-menu-sub">Shop by category</p>
            {cats.map((c) => (
              <Link key={c.id} href={c.href} onClick={onClose} className="t14-menu-cat">
                <span>{c.name}</span>
                <small>{c.count}</small>
              </Link>
            ))}
          </>
        ) : null}
      </nav>
      <div className="t14-menu-foot t14-container">
        {shop ? (
          <Link className="t14-btn t14-btn-block" href={shopHref(baseUrl)} onClick={onClose}>
            Shop all products <IconArrow size={16} />
          </Link>
        ) : null}
        {profile.phone ? (
          <a className="t14-btn t14-btn-ghost t14-btn-block" href={buildTelLink(profile.phone)}>
            <IconPhone size={16} /> {profile.phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Store header: brand, a wide search box and the cart on top; below it a category mega-menu button and
 * the page links. Search filters the product list live on shop pages and opens it from anywhere else.
 * Phones get a menu dialog and a full-width search row.
 */
export default function T14Header({
  logoUrl,
  currentPage,
  currentExtraKey,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
}) {
  const { baseUrl, navPages, profile, mode, toggleMode, shop, cart, openCart, pageKind, query, setQuery, shopViewKind } = useT14();
  const { subtotal } = useBag();
  const { cats, deals } = useCategoryLinks();
  const editor = useInlineEditor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaBtnRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mega-menu: closes on Escape (focus back on its button), on a click outside, and when focus leaves it.
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        megaBtnRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [megaOpen]);

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
    <span className="t14-brand-name">
      <EditableText
        value={profile.business_name}
        onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
        style={{ display: "inline" }}
      />
    </span>
  );

  const listLive = shopViewKind === "list" || shopViewKind === "category";
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    const q = query.trim();
    if (shopViewKind === "list") return; // already filtering live
    router.push(`${shopHref(baseUrl)}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const cartLabel = `Open cart${cart.ready ? `, ${cart.count} ${cart.count === 1 ? "item" : "items"}` : ""}`;

  return (
    <>
      <header className="t14-header" data-scrolled={scrolled}>
        <div className="t14-container t14-header-bar">
          <button
            type="button"
            className="t14-icon-btn t14-burger"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <IconMenu />
          </button>

          <Link href={`${baseUrl}/`} className="t14-brand" aria-label={`${profile.business_name} home`}>
            {logo}
          </Link>

          {shop ? (
            <form className="t14-search" role="search" onSubmit={submitSearch}>
              <label htmlFor="t14-search-input" className="t14-sr">
                Search products
              </label>
              <input
                id="t14-search-input"
                className="t14-search-input"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="t14-search-go" aria-label={listLive ? "Search" : "Search the shop"}>
                <IconSearch size={20} />
              </button>
            </form>
          ) : (
            <span />
          )}

          <div className="t14-header-end">
            <ModeToggle mode={mode} onToggle={toggleMode} className="t14-icon-btn" />
            {shop ? (
              <button type="button" className="t14-cart-btn" aria-haspopup="dialog" aria-label={cartLabel} onClick={openCart}>
                <span className="t14-cart-ico">
                  <IconBag />
                  {cart.ready && cart.count > 0 ? (
                    <span className="t14-bag-count" aria-hidden="true">
                      {cart.count > 99 ? "99+" : cart.count}
                    </span>
                  ) : null}
                </span>
                <span className="t14-cart-text" aria-hidden="true">
                  <small>Cart</small>
                  <b>{cart.ready && cart.count > 0 ? formatNaira(subtotal) : "Empty"}</b>
                </span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="t14-navbar">
          <div className="t14-container t14-navbar-bar" ref={megaRef}>
            {shop && cats.length > 0 ? (
              <div className="t14-mega-wrap">
                <button
                  ref={megaBtnRef}
                  type="button"
                  className="t14-mega-btn"
                  aria-expanded={megaOpen}
                  aria-controls="t14-mega"
                  onClick={() => setMegaOpen((o) => !o)}
                >
                  <IconGrid size={18} /> Categories <IconChevronDown size={14} />
                </button>
                {megaOpen ? (
                  <div
                    id="t14-mega"
                    className="t14-mega"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null) && e.relatedTarget !== megaBtnRef.current) {
                        setMegaOpen(false);
                      }
                    }}
                  >
                    <ul className="t14-mega-list">
                      {cats.map((c) => (
                        <li key={c.id}>
                          <Link href={c.href} onClick={() => setMegaOpen(false)}>
                            <span>{c.name}</span>
                            <small>
                              {c.count} {c.count === 1 ? "item" : "items"}
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="t14-mega-side">
                      <Link href={shopHref(baseUrl)} onClick={() => setMegaOpen(false)}>
                        All products <IconArrow size={16} />
                      </Link>
                      {deals > 0 ? (
                        <Link href={`${shopHref(baseUrl)}?sale=1`} onClick={() => setMegaOpen(false)} className="t14-mega-deals">
                          <IconTag size={16} /> {deals} {deals === 1 ? "deal" : "deals"} on now
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <nav className="t14-nav" aria-label="Main">
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
        </div>
      </header>

      {open ? <MobileMenu items={items} onClose={closeMenu} logo={logo} /> : null}
    </>
  );
}
