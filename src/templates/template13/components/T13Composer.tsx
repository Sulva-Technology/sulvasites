"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { ShopData } from "@/lib/shop/types";
import { IconArrowUp, IconPlus } from "../icons";
import { useT13, type T13Ctx } from "../ctx";
import { matchesQuery, typewriterStep, typewriterText, type TypeState } from "../lib";
import { categoryName, priceRange, productHref } from "../shop/helpers";

/** Home and the shop list (all products or one category) carry the composer; every other view does not. */
export function composerEligible(shop: ShopData | null, pageKind: T13Ctx["pageKind"], shopViewKind: T13Ctx["shopViewKind"]) {
  if (!shop || shop.products.length === 0) return false;
  if (shopViewKind) return shopViewKind === "list" || shopViewKind === "category";
  return pageKind === "home";
}

const START: TypeState = { i: 0, len: 0, dir: 1, hold: 0 };

/** Fixed bottom-centre search pill: typing placeholder, category menu and live results. */
export default function T13Composer() {
  const { shop, baseUrl, pageKind, shopViewKind, cartOpen } = useT13();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [ty, setTy] = useState<TypeState>(START);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const eligible = composerEligible(shop, pageKind, shopViewKind);
  const onList = shopViewKind === "list" || shopViewKind === "category";

  const phrases = useMemo(() => {
    if (!shop) return [];
    const ordered = [...shop.products.filter((p) => p.featured), ...shop.products.filter((p) => !p.featured)];
    return ordered.slice(0, 6).map((p) => p.name);
  }, [shop]);
  const faces = useMemo(() => (shop ? shop.products.filter((p) => p.images[0]).slice(0, 3) : []), [shop]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Home: appear once the hero is behind us.
  useEffect(() => {
    if (!eligible || onList) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [eligible, onList]);

  // Step aside while the footer is on screen.
  useEffect(() => {
    if (!eligible || typeof IntersectionObserver === "undefined") return;
    const footer = document.querySelector(".t13-footer");
    if (!footer) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setAtFooter(e.isIntersecting);
    });
    io.observe(footer);
    return () => io.disconnect();
  }, [eligible]);

  const typing = eligible && !reduced && !focused && !q && phrases.length > 0;
  useEffect(() => {
    if (!typing) return;
    const word = phrases[ty.i % phrases.length] ?? "";
    const delay = ty.dir === -1 ? 35 : ty.len >= word.length ? 110 : 70;
    const id = window.setTimeout(() => setTy((s) => typewriterStep(s, phrases)), delay);
    return () => window.clearTimeout(id);
  }, [typing, ty, phrases]);

  // Click outside closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const results = useMemo(() => {
    if (!shop || !q.trim()) return [];
    return shop.products.filter((p) => matchesQuery(p, categoryName(shop, p), q)).slice(0, 4);
  }, [shop, q]);

  if (!shop || !eligible) return null;

  const visible = (onList || scrolled) && !cartOpen && !atFooter;
  const typed = typing ? typewriterText(ty, phrases) : "";
  const cats = [...shop.categories].sort((a, b) => a.position - b.position);

  const go = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    router.push(`${baseUrl}/shop${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (open || q) {
      setOpen(false);
      setQ("");
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className="t13-composer" data-show={visible} aria-hidden={!visible} onKeyDown={onKeyDown}>
      <p className="t13-composer-hint">
        {faces.length > 0 ? (
          <span className="t13-composer-faces" aria-hidden="true">
            {faces.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.images[0]!.url} alt="" />
            ))}
          </span>
        ) : null}
        New pieces are ready when you are
      </p>
      <form className="t13-composer-bar" role="search" onSubmit={go}>
        <button
          type="button"
          className="t13-composer-plus"
          aria-label="Browse categories"
          aria-expanded={open}
          data-open={open}
          onClick={() => setOpen((v) => !v)}
        >
          <IconPlus size={18} />
        </button>
        <label className="t13-sr" htmlFor="t13-composer-q">
          Search the shop
        </label>
        <input
          ref={inputRef}
          id="t13-composer-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={typed ? `Search “${typed}”` : "Search the shop"}
          autoComplete="off"
          tabIndex={visible ? 0 : -1}
        />
        <button type="submit" className="t13-composer-send" aria-label="Search">
          <IconArrowUp size={16} />
        </button>
        {open ? (
          <ul className="t13-composer-menu" role="menu" aria-label="Categories">
            <li role="none">
              <Link role="menuitem" href={`${baseUrl}/shop`} onClick={() => setOpen(false)}>
                All products
              </Link>
            </li>
            {cats.map((c) => (
              <li key={c.id} role="none">
                <Link role="menuitem" href={`${baseUrl}/shop/c/${c.slug}`} onClick={() => setOpen(false)}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {q.trim() && !open ? (
          <ul className="t13-composer-results" aria-label="Matching products">
            {results.length > 0 ? (
              results.map((p) => (
                <li key={p.id}>
                  <Link href={productHref(baseUrl, p)} onClick={() => setQ("")}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" />
                    ) : (
                      <span className="t13-composer-noimg" aria-hidden="true" />
                    )}
                    <span className="t13-composer-name">{p.name}</span>
                    <span className="t13-composer-price">{formatNaira(priceRange(p).min)}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="t13-composer-none">Nothing matches. Try another word.</li>
            )}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
