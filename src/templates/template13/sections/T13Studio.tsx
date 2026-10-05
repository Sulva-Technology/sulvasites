"use client";

import Link from "next/link";
import { useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { buildWhatsAppLink } from "@/templates/shared/links";
import { useT13 } from "../ctx";
import { IconChat } from "../icons";
import { isOnSale, isSizeOption, optionGroups, priceRange } from "../shop/helpers";
import { useQuickAdd } from "./T13NewIn";

/** Light gradient band holding a live mini-shop "app window" (Offloop's light band). Always light, whatever the mode. */
export default function T13Studio() {
  const { shop, profile } = useT13();
  const quick = useQuickAdd();
  const [cat, setCat] = useState<string>("all");
  const [selId, setSelId] = useState<string | null>(null);
  if (!shop || shop.products.length === 0) return null;

  const cats = shop.categories.filter((c) => shop.products.some((p) => p.categoryId === c.id));
  const active = cats.some((c) => c.id === cat) ? cat : "all";
  const list = shop.products.filter((p) => active === "all" || p.categoryId === active);
  const tiles = list.slice(0, 4);
  const selected = tiles.find((p) => p.id === selId) ?? tiles[0] ?? shop.products[0]!;
  const activeName = active === "all" ? "All pieces" : cats.find((c) => c.id === active)?.name ?? "Pieces";
  const q = quick(selected);
  const range = priceRange(selected);
  const size = optionGroups(selected).find((g) => isSizeOption(g.name));
  const img = selected.images[0];
  const wa = profile.whatsapp ? buildWhatsAppLink(profile.whatsapp) : null;
  const waHref = wa && wa !== "#" ? `${wa}?text=${encodeURIComponent(`Hi, a question about ${selected.name}`)}` : null;

  return (
    <section className="t13-section t13-studio" aria-labelledby="t13-studio-h">
      <div className="t13-container">
        <header className="t13-studio-head">
          <p className="t13-label">The studio</p>
          <h2 id="t13-studio-h" className="t13-h2">
            Try it on, right here.
          </h2>
        </header>
        <div className="t13-win">
          <nav className="t13-win-side" aria-label="Collections">
            <p className="t13-win-h">Collections</p>
            <ul>
              {[{ id: "all", name: "All pieces" }, ...cats].map((c) => (
                <li key={c.id}>
                  <button type="button" data-active={active === c.id} aria-pressed={active === c.id} onClick={() => setCat(c.id)}>
                    <span aria-hidden="true">#</span> {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="t13-win-main">
            <div className="t13-win-bar">
              <b>{activeName}</b>
              <span>
                {list.length} {list.length === 1 ? "piece" : "pieces"}
              </span>
              <span className="t13-win-tabs" aria-hidden="true">
                <i data-on="true">Pieces</i>
                <i>Details</i>
                <i>Delivery</i>
              </span>
            </div>
            <ul className="t13-win-grid">
              {tiles.map((p) => {
                const im = p.images[0];
                return (
                  <li key={p.id}>
                    <button type="button" className="t13-win-tile" aria-pressed={p.id === selected.id} onClick={() => setSelId(p.id)}>
                      {im ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={im.url} alt="" loading="lazy" />
                      ) : (
                        <span className="t13-win-noimg" aria-hidden="true">
                          {p.name.slice(0, 1)}
                        </span>
                      )}
                      <em>{p.name}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <aside className="t13-win-detail" aria-label="Selected piece" aria-live="polite">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.alt || selected.name} />
            ) : (
              <span className="t13-win-noimg" aria-hidden="true">
                {selected.name.slice(0, 1)}
              </span>
            )}
            <h3>{selected.name}</h3>
            <p className="t13-win-price">
              {range.min !== range.max ? "From " : ""}
              {formatNaira(range.min)}
              {isOnSale(selected) && range.min === range.max ? <s>{formatNaira(selected.compareAtKobo ?? 0)}</s> : null}
            </p>
            {size ? (
              <ul className="t13-win-sizes" aria-label="Sizes">
                {size.values.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : null}
            {q.target === "out" ? (
              <span className="t13-win-cta" data-disabled="true">
                Sold out
              </span>
            ) : q.target === "choose" ? (
              <Link className="t13-win-cta" href={q.href}>
                Choose size
              </Link>
            ) : (
              <button type="button" className="t13-win-cta" onClick={q.add}>
                Add to bag
              </button>
            )}
            {waHref ? (
              <a className="t13-win-ask" href={waHref} target="_blank" rel="noopener noreferrer">
                <IconChat size={14} /> Ask about this piece
                <span className="t13-sr"> on WhatsApp</span>
              </a>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
