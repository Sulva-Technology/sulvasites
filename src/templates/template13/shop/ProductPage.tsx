"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { shopHref, useT13 } from "../ctx";
import { IconCheck, IconRuler } from "../icons";
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
import ProductCard from "./ProductCard";
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

/** Product page: gallery, colour and size pickers, size guide, stock note and add to bag. */
export default function ProductPage({ product }: { product: ShopProduct }) {
  const { baseUrl, shop, cart, openCart, announce } = useT13();
  const groups = useMemo(() => optionGroups(product), [product]);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) if (g.values.length === 1) init[g.name] = g.values[0];
    return init;
  });
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
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
  const current = images[Math.min(imgIdx, Math.max(0, images.length - 1))];

  const related = useMemo(() => {
    if (!shop) return [];
    const same = shop.products.filter((p) => p.id !== product.id && p.categoryId && p.categoryId === product.categoryId);
    const rest = shop.products.filter((p) => p.id !== product.id && !same.includes(p));
    return [...same, ...rest].slice(0, 4);
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

  return (
    <section className="t13-section t13-shop-page t13-pdp">
      <div className="t13-container">
        <nav className="t13-crumbs" aria-label="Breadcrumb">
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
          <div className="t13-gallery-pdp">
            {images.length > 1 ? (
              <ul className="t13-thumbs" aria-label="Product photos">
                {images.map((im, i) => (
                  <li key={im.url + i}>
                    <button
                      type="button"
                      aria-label={`Show photo ${i + 1} of ${images.length}`}
                      aria-pressed={i === imgIdx}
                      onClick={() => setImgIdx(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="t13-pdp-main">
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={current.alt || product.name} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t13-card-noimg" aria-hidden="true">
                  {product.name.slice(0, 1)}
                </span>
              )}
              {sale && pct > 0 ? <span className="t13-badge">-{pct}%</span> : null}
            </div>
          </div>

          <div className="t13-pdp-info" ref={formRef}>
            {cat ? <p className="t13-label">{cat}</p> : null}
            <h1 className="t13-h1 t13-pdp-title">{product.name}</h1>
            <p className="t13-pdp-price" data-sale={sale}>
              <span className="t13-price-now">{formatNaira(price)}</span>
              {sale ? (
                <s className="t13-price-was">
                  <span className="t13-sr">Was </span>
                  {formatNaira(product.compareAtKobo ?? 0)}
                </s>
              ) : null}
            </p>

            <Description text={product.description} />

            {groups.map((g) => {
              const colour = isColourOption(g.name);
              return (
                <fieldset key={g.name} className="t13-opts" data-kind={colour ? "colour" : "size"}>
                  <legend>
                    {g.name}
                    {selected[g.name] ? <span className="t13-opts-picked">: {selected[g.name]}</span> : null}
                  </legend>
                  <div className="t13-opts-row">
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
                          {hex ? (
                            <span className="t13-swatch" style={{ background: hex }} aria-hidden="true" />
                          ) : null}
                          <span className={hex ? "t13-sr" : "t13-opt-text"}>
                            {val}
                            {!ok ? <span className="t13-sr"> (sold out)</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {isSizeOption(g.name) ? (
                    <button type="button" className="t13-link-btn t13-guide-btn" onClick={() => setShowGuide(true)} aria-haspopup="dialog">
                      <IconRuler size={16} /> Size guide
                    </button>
                  ) : null}
                </fieldset>
              );
            })}

            <p className="t13-stock" data-state={soldOutAll ? "out" : (stock?.kind ?? "pick")} aria-live="polite">
              {soldOutAll ? (
                "Sold out"
              ) : stock?.kind === "out" ? (
                "Sold out in this option"
              ) : stock?.kind === "low" ? (
                `Only ${stock.left} left`
              ) : stock?.kind === "in" ? (
                <>
                  <IconCheck size={15} /> In stock
                </>
              ) : (
                ""
              )}
            </p>

            <div className="t13-buy">
              <div className="t13-stepper t13-stepper-lg" role="group" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  –
                </button>
                <span className="t13-stepper-n" aria-live="polite" aria-atomic="true">
                  {qty}
                </span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))} disabled={qty >= maxQty}>
                  +
                </button>
              </div>
              <button type="button" className="t13-btn t13-btn-lg t13-btn-grow" onClick={add} aria-disabled={soldOutAll}>
                {soldOutAll ? "Sold out" : "Add to bag"}
              </button>
            </div>
            {error ? (
              <p className="t13-form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="t13-related" aria-labelledby="t13-related-h">
            <h2 id="t13-related-h" className="t13-h3">
              You may also like
            </h2>
            <ul className="t13-grid" data-cols="4">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {showGuide ? <SizeGuide onClose={() => setShowGuide(false)} /> : null}
    </section>
  );
}
