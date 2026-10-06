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
import {
  IconArrow,
  IconBag,
  IconChevronDown,
  IconClose,
  IconDoc,
  IconGrid,
  IconHome,
  IconInfo,
  IconMenu,
  IconPhone,
  IconSearch,
  IconTag,
} from "../icons";
import { dealProducts, productHref } from "../shop/helpers";
import { useFocusTrap } from "../shop/useFocusTrap";

type NavItem = { id: string; href: string; label: string; active: boolean; coreKey?: PageKey; icon: React.ReactNode };

function useCategoryLinks() {
  const { shop, baseUrl } = useT14();
  if (!shop) return { cats: [], deals: 0 };
  const counts = new Map<string, number>();
  const thumbs = new Map<string, string>();
  for (const p of shop.products) {
    if (!p.categoryId) continue;
    counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    if (!thumbs.has(p.categoryId) && p.images[0]?.url) thumbs.set(p.categoryId, p.images[0].url);
  }
  const cats = [...shop.categories]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      name: c.name,
      href: `${baseUrl}/shop/c/${c.slug}`,
      count: counts.get(c.id) ?? 0,
      thumb: thumbs.get(c.id) ?? null,
    }));
  return { cats, deals: dealProducts(shop).length };
}

function MobileMenu({
  items,
  onClose,
  logo,
  extra,
}: {
  items: NavItem[];
  onClose: () => void;
  logo: React.ReactNode;
  extra: React.ReactNode;
}) {
  const { profile, shop, baseUrl } = useT14();
  const { cats } = useCategoryLinks();
  const ref = useFocusTrap<HTMLDivElement>(onClose, "[data-autofocus]");
  return (
    <div
      ref={ref}
      className="t14-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      tabIndex={-1}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="t14-menu-sheet">
        <div className="t14-menu-top">
          <span className="t14-menu-brand">{logo}</span>
          <div className="t14-menu-top-end">
            {extra}
            <button type="button" className="t14-icon" aria-label="Close menu" onClick={onClose} data-autofocus>
              <IconClose size={18} />
            </button>
          </div>
        </div>
        <nav className="t14-menu-links" aria-label="Mobile">
          {items.map((it) => (
            <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined} onClick={onClose}>
              <span>{it.label}</span>
              <IconArrow size={16} />
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
        <div className="t14-menu-foot">
          {shop ? (
            <Link className="t14-pill t14-pill-black t14-pill-lg t14-pill-block" href={shopHref(baseUrl)} onClick={onClose}>
              Shop all products <IconArrow size={16} />
            </Link>
          ) : null}
          {profile.phone ? (
            <a className="t14-pill t14-pill-soft t14-pill-lg t14-pill-block" href={buildTelLink(profile.phone)}>
              <IconPhone size={16} /> {profile.phone}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Three floating glass islands (after nor.ma): wordmark, nav with small line icons, and actions (search,
 * mode, bag). Glass over a home hero photo, white-frosted everywhere else and once scrolled past the hero.
 * Search opens a sheet under the islands; categories open a card grid. Phones keep the brand, the actions
 * and a menu button, which opens the menu sheet.
 */
export default function T14Header({
  logoUrl,
  currentPage,
  currentExtraKey,
  overHero = false,
}: {
  logoUrl: string | null;
  currentPage: PageKey | null;
  currentExtraKey?: string | null;
  /** The page's first section is a hero (the header may sit over its photo). */
  overHero?: boolean;
}) {
  const { baseUrl, navPages, profile, mode, toggleMode, shop, cart, openCart, pageKind, query, setQuery, shopViewKind, photos } = useT14();
  const { cats, deals } = useCategoryLinks();
  const editor = useInlineEditor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaBtnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const overPhoto = pageKind === "home" && photos.length > 0 && overHero;

  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mega menu and search sheet: close on Escape (focus back on the trigger) and on a click outside.
  useEffect(() => {
    if (!megaOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (megaOpen) {
        setMegaOpen(false);
        megaBtnRef.current?.focus();
      }
      if (searchOpen) {
        setSearchOpen(false);
        searchBtnRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (megaOpen && !megaRef.current?.contains(t) && !megaBtnRef.current?.contains(t)) setMegaOpen(false);
      if (searchOpen && !searchRef.current?.contains(t) && !searchBtnRef.current?.contains(t)) setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [megaOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const onShop = pageKind === "shop";
  const hasShopPage = navPages.some((p) => p.key === "shop");
  const items: NavItem[] = [
    { id: "home", coreKey: "home", href: `${baseUrl}/`, label: navLabels.home || "Home", active: currentPage === "home", icon: <IconHome size={14} /> },
    // The "shop" preset page always leads to the storefront; with a live shop and no such page, add a Shop link.
    ...(shop && !hasShopPage ? [{ id: "shop", href: shopHref(baseUrl), label: "Shop", active: onShop, icon: <IconBag size={14} /> }] : []),
    ...navPages.map((p) => ({
      id: `p-${p.key}`,
      href: p.key === "shop" && shop ? shopHref(baseUrl) : `${baseUrl}/p/${p.key}`,
      label: p.label,
      active: p.key === "shop" ? onShop : currentExtraKey === p.key,
      icon: p.key === "shop" ? <IconBag size={14} /> : <IconDoc size={14} />,
    })),
    { id: "about", coreKey: "about", href: `${baseUrl}/about`, label: navLabels.about || "About", active: currentPage === "about", icon: <IconInfo size={14} /> },
    { id: "contact", coreKey: "contact", href: `${baseUrl}/contact`, label: navLabels.contact || "Contact", active: currentPage === "contact", icon: <IconPhone size={14} /> },
  ];
  // The home link is the wordmark on desktop; keep it in the nav only for the phone menu.
  // The wordmark is home on desktop; in the editor keep a Home item so its label stays editable.
  const navItems = items.filter((it) => (it.id !== "home" || editor?.enabled) && !(shop && it.href === shopHref(baseUrl)));
  const hasDealsPage = navPages.some((p) => p.key === "deals" || /^deals$/i.test(p.label.trim()));

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

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    const q = query.trim();
    setSearchOpen(false);
    searchBtnRef.current?.focus();
    if (shopViewKind === "list") return; // already filtering live
    router.push(`${shopHref(baseUrl)}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const needle = query.trim().toLowerCase();
  const hits = shop && needle ? shop.products.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 5) : [];

  const cartLabel = `Open cart${cart.ready ? `, ${cart.count} ${cart.count === 1 ? "item" : "items"}` : ""}`;
  const tone = overPhoto && !scrolled && !megaOpen && !searchOpen ? "glass" : "solid";
  const modeToggle = (className: string) => <ModeToggle mode={mode} onToggle={toggleMode} className={className} />;

  return (
    <>
      <header className="t14-header" data-tone={tone}>
        <div className="t14-container t14-header-row">
          <Link href={`${baseUrl}/`} className="t14-island t14-brand" aria-label={`${profile.business_name} home`}>
            {logo}
          </Link>

          <nav className="t14-island t14-nav" aria-label="Main">
            {shop ? (
              <Link href={shopHref(baseUrl)} data-active={onShop} aria-current={onShop ? "page" : undefined}>
                <IconBag size={14} /> Shop
              </Link>
            ) : null}
            {shop && cats.length > 0 ? (
              <button
                ref={megaBtnRef}
                type="button"
                aria-expanded={megaOpen}
                aria-controls="t14-mega"
                onClick={() => {
                  setSearchOpen(false);
                  setMegaOpen((o) => !o);
                }}
              >
                <IconGrid size={14} /> Categories <IconChevronDown size={12} />
              </button>
            ) : null}
            {shop && deals > 0 && !hasDealsPage ? (
              <Link href={`${shopHref(baseUrl)}?sale=1`}>
                <IconTag size={14} /> Deals
              </Link>
            ) : null}
            {navItems.map((it) => (
              <Link key={it.id} href={it.href} data-active={it.active} aria-current={it.active ? "page" : undefined}>
                {it.icon}
                {it.coreKey ? (
                  <EditableText value={it.label} onCommit={(next) => saveNavLabel(it.coreKey!, next)} style={{ display: "inline" }} />
                ) : (
                  it.label
                )}
              </Link>
            ))}
          </nav>

          <div className="t14-island t14-actions">
            {shop ? (
              <button
                ref={searchBtnRef}
                type="button"
                className="t14-icon"
                aria-label="Search products"
                aria-expanded={searchOpen}
                aria-controls="t14-searchsheet"
                onClick={() => {
                  setMegaOpen(false);
                  setSearchOpen((o) => !o);
                }}
              >
                <IconSearch size={16} />
              </button>
            ) : null}
            {modeToggle("t14-icon t14-icon-mode")}
            {shop ? (
              <button type="button" className="t14-pill t14-pill-black t14-bagpill" aria-haspopup="dialog" aria-label={cartLabel} onClick={openCart}>
                Bag
                {cart.ready && cart.count > 0 ? <b aria-hidden="true">{cart.count > 99 ? "99+" : cart.count}</b> : null}
              </button>
            ) : null}
            <button
              type="button"
              className="t14-icon t14-burger"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <IconMenu size={18} />
            </button>
          </div>
        </div>

        {megaOpen && shop ? (
          <div
            id="t14-mega"
            ref={megaRef}
            className="t14-mega t14-container"
            onBlur={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && !e.currentTarget.contains(next) && next !== megaBtnRef.current) setMegaOpen(false);
            }}
          >
            {cats.map((c) => (
              <Link key={c.id} href={c.href} className="t14-mega-card" onClick={() => setMegaOpen(false)}>
                <span className="t14-mega-thumb">
                  {c.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumb} alt="" loading="lazy" />
                  ) : null}
                </span>
                <span className="t14-mega-name">{c.name}</span>
                <small>
                  {c.count} {c.count === 1 ? "item" : "items"}
                </small>
              </Link>
            ))}
          </div>
        ) : null}

        {searchOpen && shop ? (
          <form id="t14-searchsheet" ref={searchRef} className="t14-searchsheet t14-container" role="search" onSubmit={submitSearch}>
            <label htmlFor="t14-search-input" className="t14-sr">
              Search products
            </label>
            <div className="t14-searchfield">
              <IconSearch size={18} />
              <input
                id="t14-search-input"
                ref={searchInputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="t14-pill t14-pill-black">
                Search
              </button>
            </div>
            {hits.length > 0 ? (
              <ul className="t14-searchhits">
                {hits.map((p) => (
                  <li key={p.id}>
                    <Link href={productHref(baseUrl, p)} onClick={() => {
                        setSearchOpen(false);
                        searchBtnRef.current?.focus();
                      }}>
                      <span className="t14-searchthumb">
                        {p.images[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt="" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="t14-searchname">{p.name}</span>
                      <span className="t14-searchprice">{formatNaira(p.priceKobo)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : needle ? (
              <p className="t14-searchnone">No products match that search yet.</p>
            ) : null}
          </form>
        ) : null}
      </header>

      {open ? (
        <MobileMenu items={items} onClose={closeMenu} logo={logo} extra={modeToggle("t14-icon")} />
      ) : null}
    </>
  );
}
