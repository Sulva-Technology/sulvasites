"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT13 } from "../ctx";
import { IconRuler } from "../icons";
import T13Marquee from "../sections/T13Marquee";
import {
  categoryName,
  discountPercent,
  findVariant,
  isColourOption,
  isOnSale,
  isSizeOption,
  optionAvailable,
  optionGroups,
  productSoldOut,
  stockOf,
  swatchColour,
  unitPrice,
  variantInStock,
} from "./helpers";
import SizeGuide from "./SizeGuide";

function Description({ text }: { text: string | null }) {
  const paras = (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return null;
  return (
    <div className="t13-desc">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Product page: image stack, sticky buy panel (options, size guide, stock, bag, WhatsApp) and details. */
export default function ProductPage({ product }: { product: ShopProduct }) {
  const { baseUrl, shop, cart, openCart, announce, profile } = useT13();
  const groups = useMemo(() => optionGroups(product), [product]);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) if (g.values.length === 1) init[g.name] = g.values[0];
    return init;
  });
  const [qty, setQty] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const variant = findVariant(product, selected);
  const hasVariants = product.variants.length > 0;
  const soldOutAll = productSoldOut(product);
  const stock = hasVariants ? (variant ? stockOf(variant) : null) : { kind: "in" as const };
  const price = unitPrice(product, variant);
  const sale = isOnSale(product);
  const pct = discountPercent(product);
  const inBag = cart.lines
    .filter((l) => l.productId === product.id && l.variantId === (variant?.id ?? null))
    .reduce((n, l) => n + l.quantity, 0);
  const maxQty = variant && variant.stock !== null ? Math.max(0, variant.stock - inBag) : 99;
  const cat = shop ? categoryName(shop, product) : null;
  const images = product.images;
  const [lead, ...rest] = images;

  // "You may also like": the same category when there is one, else everything else.
  const related = useMemo(() => {
    if (!shop) return [];
    const others = shop.products.filter((p) => p.id !== product.id);
    const same = others.filter((p) => p.categoryId && p.categoryId === product.categoryId);
    return same.length > 0 ? same : others;
  }, [shop, product]);

  const pick = (name: string, value: string) => {
    setSelected((s) => ({ ...s, [name]: value }));
    setError(null);
    setQty(1);
  };

  const add = () => {
    if (soldOutAll) return;
    const missing = groups.find((g) => !selected[g.name]);
    if (missing) {
      setError(`Please choose a ${missing.name.toLowerCase()}.`);
      formRef.current?.querySelector<HTMLInputElement>(`input[name="opt-${missing.name}"]:not(:disabled)`)?.focus();
      return;
    }
    if (hasVariants && (!variant || !variantInStock(variant))) {
      setError("That combination is sold out. Try another option.");
      return;
    }
    const n = Math.min(qty, maxQty);
    if (n < 1) {
      setError("You already have all available stock in your bag.");
      return;
    }
    cart.add({ productId: product.id, variantId: variant?.id ?? null, quantity: n });
    announce(`${product.name} added to your bag`);
    setError(null);
    setQty(1);
    openCart();
  };

  const stockState = soldOutAll || stock?.kind === "out" ? "out" : stock?.kind === "low" ? "low" : stock?.kind === "in" ? "in" : null;
  const delivery = shop?.settings;
  const hasDescription = !!(product.description ?? "").trim();

  return (
    <section className="t13-section t13-pdp">
      <div className="t13-container">
        <nav className="t13-crumbs t13-pdp-crumbs" aria-label="Breadcrumb">
          <Link href={shopHref(baseUrl)}>Shop</Link>
          {cat && product.categoryId ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`${baseUrl}/shop/c/${shop?.categories.find((c) => c.id === product.categoryId)?.slug ?? ""}`}>{cat}</Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="t13-pdp-grid">
          <div className="t13-pdp-stack">
            <div className="t13-pdp-hero">
              {lead ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lead.url} alt={lead.alt || product.name} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t13-pc-noimg" aria-hidden="true">
                  {product.name.slice(0, 1)}
                </span>
              )}
              {sale && pct > 0 ? <span className="t13-pc-badge t13-mono">−{pct}%</span> : null}
            </div>
            {rest.length > 0 ? (
              <ul className="t13-pdp-more">
                {rest.map((im, i) => (
                  <li key={im.url + i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.alt || `${product.name}, photo ${i + 2}`} loading="lazy" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="t13-pdp-info" ref={formRef}>
            {cat ? <p className="t13-pdp-cat t13-mono">{cat}</p> : null}
            <h1 className="t13-pdp-title">{product.name}</h1>
            <p className="t13-pdp-price t13-mono" data-sale={sale}>
              <span className="t13-price-now">{formatNaira(price)}</span>
              {sale ? (
                <>
                  <s className="t13-price-was">
                    <span className="t13-sr">Was </span>
                    {formatNaira(product.compareAtKobo ?? 0)}
                  </s>
                  {pct > 0 ? <span className="t13-pdp-save">−{pct}%</span> : null}
                </>
              ) : null}
            </p>

            <hr className="t13-hr" />

            {groups.map((g, gi) => {
              const colour = isColourOption(g.name);
              const labelId = `t13-og-${gi}`;
              return (
                <div key={g.name} className="t13-og" role="group" aria-labelledby={labelId} data-kind={colour ? "colour" : "size"}>
                  <div className="t13-og-head">
                    <span id={labelId} className="t13-og-label">
                      {g.name}
                    </span>
                    {selected[g.name] ? <span className="t13-mono t13-og-picked">{selected[g.name]}</span> : null}
                    {isSizeOption(g.name) ? (
                      <button type="button" className="t13-text-btn t13-og-guide" onClick={() => setShowGuide(true)} aria-haspopup="dialog">
                        <IconRuler size={14} /> Size guide
                      </button>
                    ) : null}
                  </div>
                  <div className="t13-og-row">
                    {g.values.map((val) => {
                      const ok = optionAvailable(product, selected, g.name, val);
                      const hex = colour ? swatchColour(val) : null;
                      return (
                        <label key={val} className="t13-opt" data-swatch={!!hex} data-out={!ok}>
                          <input
                            type="radio"
                            name={`opt-${g.name}`}
                            value={val}
                            checked={selected[g.name] === val}
                            disabled={!ok}
                            onChange={() => pick(g.name, val)}
                          />
                          {hex ? <span className="t13-swatch" style={{ background: hex }} aria-hidden="true" /> : null}
                          <span className={hex ? "t13-sr" : "t13-opt-text t13-mono"}>
                            {val}
                            {!ok ? <span className="t13-sr"> (sold out)</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p className="t13-stock" data-state={stockState ?? "pick"} aria-live="polite">
              {stockState ? <span className="t13-dot" data-state={stockState} aria-hidden="true" /> : null}
              {soldOutAll
                ? "Sold out"
                : stock?.kind === "out"
                  ? "Sold out in this option"
                  : stock?.kind === "low"
                    ? `Only ${stock.left} left`
                    : stock?.kind === "in"
                      ? "In stock"
                      : ""}
            </p>

            <div className="t13-step t13-step-lg" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                −
              </button>
              <span className="t13-step-n t13-mono" aria-live="polite" aria-atomic="true">
                {qty}
              </span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))} disabled={qty >= maxQty}>
                +
              </button>
            </div>

            <button type="button" className="t13-pill t13-pill-lg t13-add" onClick={add} aria-disabled={soldOutAll}>
              {soldOutAll ? "Sold out" : "Add to bag"}
            </button>
            {profile.whatsapp ? (
              <a
                className="t13-pill t13-pill-glass t13-pill-lg t13-wa"
                href={buildWhatsAppLink(profile.whatsapp)}
                target="_blank"
                rel="noreferrer"
              >
                Buy on WhatsApp
              </a>
            ) : null}
            {error ? (
              <p className="t13-form-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="t13-acc-list">
              {hasDescription ? (
                <details className="t13-acc" open>
                  <summary>
                    <span className="t13-mono t13-acc-n">01</span>
                    <span className="t13-acc-t">Description</span>
                    <span className="t13-acc-plus" aria-hidden="true" />
                  </summary>
                  <div className="t13-acc-body">
                    <Description text={product.description} />
                  </div>
                </details>
              ) : null}
              {delivery ? (
                <details className="t13-acc">
                  <summary>
                    <span className="t13-mono t13-acc-n">{hasDescription ? "02" : "01"}</span>
                    <span className="t13-acc-t">Delivery &amp; pickup</span>
                    <span className="t13-acc-plus" aria-hidden="true" />
                  </summary>
                  <div className="t13-acc-body">
                    <p>
                      {delivery.deliveryFeeKobo > 0
                        ? `Delivery is ${formatNaira(delivery.deliveryFeeKobo)}, added at checkout.`
                        : "Delivery is free."}
                    </p>
                    {delivery.pickupEnabled ? (
                      <p>{delivery.pickupNote ? `Pickup is available. ${delivery.pickupNote}` : "Pickup is available."}</p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="t13-related" aria-labelledby="t13-related-h">
          <div className="t13-container">
            <h2 id="t13-related-h" className="t13-related-title">
              You may also like
            </h2>
          </div>
          <T13Marquee products={related} label="You may also like" />
        </section>
      ) : null}
      {showGuide ? <SizeGuide onClose={() => setShowGuide(false)} /> : null}
    </section>
  );
}
