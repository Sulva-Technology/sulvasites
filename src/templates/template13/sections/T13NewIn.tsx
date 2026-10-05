"use client";

import Link from "next/link";

import type { ShopProduct } from "@/lib/shop/types";
import { cityOf, shopHref, useT13 } from "../ctx";
import { IconArrow } from "../icons";
import { initials } from "../lib";
import { PriceText } from "../shop/ProductCard";
import {
  categoryName,
  isSizeOption,
  optionGroups,
  productHref,
  productSoldOut,
  quickAddTarget,
  stockOf,
  variantInStock,
} from "../shop/helpers";

/** Stock line for a product: worst state across variants that can still be bought. */
export function stockLine(product: ShopProduct): { state: "in" | "low" | "out"; label: string } {
  if (productSoldOut(product)) return { state: "out", label: "Sold out" };
  const live = product.variants.filter(variantInStock);
  if (live.length > 0 && live.every((v) => stockOf(v).kind === "low")) {
    const left = Math.max(...live.map((v) => v.stock ?? 0));
    return { state: "low", label: `Only ${left} left` };
  }
  return { state: "in", label: "In stock" };
}

/** Same cart call as ProductPage; callers link to the product page when options need choosing. */
export function useQuickAdd() {
  const { cart, announce, baseUrl } = useT13();
  return (product: ShopProduct) => {
    const target = quickAddTarget(product);
    return {
      target,
      href: productHref(baseUrl, product),
      add: () => {
        if (target === "choose" || target === "out") return;
        cart.add({ productId: product.id, variantId: target.variantId, quantity: 1 });
        announce("Added to your bag");
      },
    };
  };
}

function optionSummary(product: ShopProduct): string {
  const groups = optionGroups(product);
  const size = groups.find((g) => isSizeOption(g.name));
  const parts: string[] = [];
  if (size) parts.push(size.values.join(" · "));
  const colours = groups.find((g) => /^(colou?r|shade)$/i.test(g.name.trim()));
  if (colours) parts.push(`${colours.values.length} ${colours.values.length === 1 ? "colour" : "colours"}`);
  if (!parts.length && groups[0]) parts.push(groups[0].values.join(" · "));
  return parts.join(" — ");
}

/** "New in": sticky headline on the left, a feed of product cards on the right (Offloop's split sections). */
export default function T13NewIn() {
  const { shop, baseUrl, profile } = useT13();
  const quick = useQuickAdd();
  if (!shop || shop.products.length === 0) return null;
  const ordered = [...shop.products.filter((p) => p.featured), ...shop.products.filter((p) => !p.featured)];
  const picks = ordered.slice(0, 6);
  const city = cityOf(profile.address);
  const n = shop.products.length;

  return (
    <section id="t13-new-in" className="t13-section t13-split" aria-labelledby="t13-newin-h">
      <div className="t13-container t13-split-grid">
        <div className="t13-split-side">
          <div className="t13-sticky">
            <p className="t13-label">New in</p>
            <h2 id="t13-newin-h" className="t13-h2">
              This week’s arrivals.
            </h2>
            <p className="t13-lead">
              {n} {n === 1 ? "piece" : "pieces"}, ready to ship{city ? ` from ${city}` : ""}. Tap any piece to see it up close.
            </p>
            <Link className="t13-pill t13-pill-solid" href={shopHref(baseUrl)} style={{ marginTop: 24 }}>
              View all <IconArrow size={16} />
            </Link>
          </div>
        </div>
        <ol className="t13-feed">
          {picks.map((p, i) => {
            const cat = categoryName(shop, p);
            const q = quick(p);
            const stock = stockLine(p);
            const img = p.images[0];
            const summary = optionSummary(p);
            return (
              <li key={p.id} className="t13-feed-item t13-reveal" style={{ ["--d" as string]: i }}>
                <article className="t13-feed-card">
                  <header className="t13-feed-head">
                    <span className="t13-avatar" aria-hidden="true">
                      {initials(cat || p.name)}
                    </span>
                    <b>{cat ?? "New in"}</b>
                    <span className="t13-mono t13-dim">added {p.name}</span>
                  </header>
                  <Link className="t13-feed-body" href={q.href}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={img.alt || ""} width={120} height={150} loading="lazy" />
                    ) : (
                      <span className="t13-feed-noimg" aria-hidden="true">
                        {p.name.slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <h3 className="t13-h3">{p.name}</h3>
                      {summary ? <p className="t13-mono t13-dim">{summary}</p> : null}
                      <PriceText product={p} />
                    </div>
                  </Link>
                  <footer className="t13-feed-foot">
                    <span className="t13-dot" data-state={stock.state} aria-hidden="true" />
                    {stock.label}
                    {q.target === "out" ? null : q.target === "choose" ? (
                      <Link className="t13-pill t13-pill-glass t13-pill-sm" href={q.href}>
                        Choose size
                      </Link>
                    ) : (
                      <button type="button" className="t13-pill t13-pill-glass t13-pill-sm" onClick={q.add}>
                        Add to bag
                      </button>
                    )}
                  </footer>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
