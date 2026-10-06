"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { formatNaira } from "@/lib/shop/money";
import { useT14 } from "../ctx";
import { IconGrid, IconSearch } from "../icons";
import { priceRange } from "../shop/helpers";

/** Tabbed category browser: chip tabs on the left, a decorative phone with real product links on the right. */
export default function T14Showcase() {
  const { shop, baseUrl, profile } = useT14();
  const [active, setActive] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (idx: number) => {
    setActive(idx);
    setSwapped(true);
  };

  if (!shop || shop.products.length === 0) return null;
  const groups = [...shop.categories]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ cat: c, products: shop.products.filter((p) => p.categoryId === c.id) }))
    .filter((g) => g.products.length > 0);
  if (groups.length === 0) return null;

  const i = Math.min(active, groups.length - 1);
  const group = groups[i]!;
  const from = Math.min(...group.products.map((p) => priceRange(p).min));
  const n = group.products.length;

  const move = (to: number) => {
    const next = (to + groups.length) % groups.length;
    select(next);
    tabRefs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(groups.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section id="t14-showcase" className="t14-band t14-paper t14-show" aria-labelledby="t14-show-h">
      <div className="t14-container t14-show-inner t14-reveal">
        <div className="t14-show-copy">
          <h2 id="t14-show-h" className="t14-h2">
            Browse by
            <br />
            what you need.
          </h2>
          <div className="t14-show-tabs" role="tablist" aria-label="Categories" onKeyDown={onKey}>
            {groups.map((g, idx) => (
              <button
                key={g.cat.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`t14-show-tab-${idx}`}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-controls="t14-show-panel"
                tabIndex={idx === i ? 0 : -1}
                className="t14-show-tab"
                onClick={() => select(idx)}
              >
                <IconGrid size={14} /> {g.cat.name}
              </button>
            ))}
          </div>
          <div
            id="t14-show-panel"
            role="tabpanel"
            aria-labelledby={`t14-show-tab-${i}`}
            className="t14-show-caption t14-showcase-panel"
            data-swap={swapped}
            key={group.cat.id}
          >
            <h3 className="t14-h3">{group.cat.name}</h3>
            <p>
              {n} {n === 1 ? "product" : "products"} from {formatNaira(from)}
            </p>
          </div>
        </div>

        <div className="t14-phone t14-showcase-panel" data-swap={swapped} key={`phone-${group.cat.id}`}>
          <div className="t14-phone-status" aria-hidden="true">
            <span>9:41</span>
            <svg width="44" height="12" viewBox="0 0 44 12" fill="currentColor" focusable="false">
              <rect x="0" y="7" width="3" height="5" rx="1" />
              <rect x="5" y="5" width="3" height="7" rx="1" />
              <rect x="10" y="2" width="3" height="10" rx="1" />
              <path d="M19 4.2a8 8 0 0 1 10 0M21.4 6.9a4.6 4.6 0 0 1 5.2 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="33.5" y="1.5" width="9" height="9" rx="2.5" fill="none" stroke="currentColor" />
              <rect x="35" y="3" width="6" height="6" rx="1.5" />
            </svg>
          </div>
          <p className="t14-phone-title">{profile.business_name}</p>
          <ul className="t14-phone-list">
            {group.products.slice(0, 7).map((p) => (
              <li key={p.id}>
                <Link href={`${baseUrl}/shop/${p.slug}`}>
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt="" loading="lazy" />
                  ) : (
                    <span className="t14-phone-noimg" aria-hidden="true" />
                  )}
                  <span className="t14-phone-name">{p.name}</span>
                  <b>{formatNaira(priceRange(p).min)}</b>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="t14-phone-search" href={`${baseUrl}/shop/c/${group.cat.slug}`}>
            <IconSearch size={14} /> Search {group.cat.name}
          </Link>
        </div>
      </div>
    </section>
  );
}
