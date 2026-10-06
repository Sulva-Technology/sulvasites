"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { shopHref, useT14 } from "../ctx";
import { IconArrow, IconChevron } from "../icons";
import { categoryName, dealProducts, productHref } from "../shop/helpers";
import { PriceText } from "../shop/ProductCard";

/** Horizontal product rail with round arrow buttons. Leads with deals when there are any. */
export default function T14Rail() {
  const { shop, baseUrl } = useT14();
  const railRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, shop]);

  if (!shop || shop.products.length === 0) return null;

  const deals = dealProducts(shop);
  const onSale = deals.length >= 3;
  const seen = new Set(deals.map((p) => p.id));
  const rest = shop.products.filter((p) => !seen.has(p.id));
  const featured = rest.filter((p) => p.featured);
  const others = rest.filter((p) => !p.featured);
  const items = (onSale ? deals : [...deals, ...featured, ...others]).slice(0, 12);
  const [line1, line2] = onSale ? ["On sale now.", "While stock lasts."] : ["Popular right now.", "Picked by our customers."];

  const scrollByCard = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector("li");
    const w = (card ? card.getBoundingClientRect().width : 300) + 12;
    el.scrollBy({ left: dir * w, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <section className="t14-rail t14-reveal" aria-labelledby="t14-rail-h">
      <div className="t14-container t14-rail-head">
        <div>
          <h2 id="t14-rail-h" className="t14-h2">
            {line1}
            <br />
            <span className="t14-dim">{line2}</span>
          </h2>
          <p className="t14-lead">Browse the whole range in our shop.</p>
          <Link className="t14-textlink t14-rail-all" href={shopHref(baseUrl)}>
            View all products <IconArrow size={16} />
          </Link>
        </div>
        <div className="t14-rail-nav">
          <button type="button" className="t14-rail-btn t14-rail-prev" aria-label="Previous products" disabled={atStart} onClick={() => scrollByCard(-1)}>
            <IconChevron size={18} />
          </button>
          <button type="button" className="t14-rail-btn" aria-label="Next products" disabled={atEnd} onClick={() => scrollByCard(1)}>
            <IconChevron size={18} />
          </button>
        </div>
      </div>

      <ul className="t14-rail-track" ref={railRef} aria-label="Products">
        {items.map((p) => {
          const img = p.images[0];
          const cat = categoryName(shop, p);
          const opts = p.variants.length > 1 ? `${p.variants.length} options` : "1 option";
          return (
            <li key={p.id} className="t14-rail-card t14-paper">
              <Link href={productHref(baseUrl, p)} className="t14-rail-link">
                <span className="t14-rail-img">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt || ""} loading="lazy" />
                  ) : null}
                </span>
                <span className="t14-rail-name">{p.name}</span>
                <span className="t14-rail-meta">{cat ? `${cat} · ${opts}` : opts}</span>
                <PriceText product={p} className="t14-rail-price" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
