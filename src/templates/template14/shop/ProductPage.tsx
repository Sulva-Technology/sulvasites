"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { shopHref, useT14 } from "../ctx";
import { IconAlert, IconCheck } from "../icons";
import {
  categoryName,
  discountPercent,
  findVariant,
  isOnSale,
  optionAvailable,
  optionGroups,
  productSoldOut,
  stockOf,
  unitPrice,
  variantInStock,
} from "./helpers";
import ProductCard from "./ProductCard";

function Description({ text }: { text: string | null }) {
  const paras = (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return null;
  return (
    <div className="t14-desc">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Product page: gallery, colour and size pickers, size guide, stock note and add to cart. */
export default function ProductPage({ product }: { product: ShopProduct }) {
  const { baseUrl, shop, cart, openCart, announce } = useT14();
  const groups = useMemo(() => optionGroups(product), [product]);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) if (g.values.length === 1) init[g.name] = g.values[0];
    return init;
  });
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
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
      setError("You already have all available stock in your cart.");
      return;
    }
    cart.add({ productId: product.id, variantId: variant?.id ?? null, quantity: n });
    announce(`${product.name} added to your cart`);
    setError(null);
    setQty(1);
    openCart();
  };

  return (
    <section className="t14-section t14-shop-page t14-pdp">
      <div className="t14-container">
        <nav className="t14-crumbs" aria-label="Breadcrumb">
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

        <div className="t14-pdp-grid">
          <div className="t14-gallery-pdp">
            {images.length > 1 ? (
              <ul className="t14-thumbs" aria-label="Product photos">
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
            <div className="t14-pdp-main">
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={current.alt || product.name} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t14-card-noimg" aria-hidden="true">
                  {product.name.slice(0, 1)}
                </span>
              )}
              {sale && pct > 0 ? <span className="t14-badge">-{pct}%</span> : null}
            </div>
          </div>

          <div className="t14-pdp-info" ref={formRef}>
            {cat ? <p className="t14-label">{cat}</p> : null}
            <h1 className="t14-h1 t14-pdp-title">{product.name}</h1>
            <p className="t14-pdp-price" data-sale={sale}>
              <span className="t14-price-now">{formatNaira(price)}</span>
              {sale ? (
                <s className="t14-price-was">
                  <span className="t14-sr">Was </span>
                  {formatNaira(product.compareAtKobo ?? 0)}
                </s>
              ) : null}
            </p>

            <Description text={product.description} />

            {groups.map((g) => (
              <div key={g.name} className="t14-opts">
                <label className="t14-opts-label" htmlFor={`t14-opt-${g.name}`}>
                  {g.name}
                </label>
                <select
                  id={`t14-opt-${g.name}`}
                  name={`opt-${g.name}`}
                  className="t14-input"
                  value={selected[g.name] ?? ""}
                  onChange={(e) => pick(g.name, e.target.value)}
                >
                  <option value="">Choose {g.name.toLowerCase()}</option>
                  {g.values.map((val) => {
                    const ok = optionAvailable(product, selected, g.name, val);
                    return (
                      <option key={val} value={val} disabled={!ok}>
                        {val}
                        {!ok ? " (sold out)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}

            <p className="t14-stock" data-state={soldOutAll ? "out" : (stock?.kind ?? "pick")} aria-live="polite">
              {soldOutAll ? (
                "Sold out"
              ) : stock?.kind === "out" ? (
                <>
                  <IconAlert size={16} /> Sold out in this option
                </>
              ) : stock?.kind === "low" ? (
                <>
                  <IconAlert size={16} /> Only {stock.left} left
                </>
              ) : stock?.kind === "in" ? (
                <>
                  <IconCheck size={16} /> In stock
                </>
              ) : (
                "Choose your options to see availability"
              )}
            </p>

            <div className="t14-buy">
              <div className="t14-stepper t14-stepper-lg" role="group" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  –
                </button>
                <span className="t14-stepper-n" aria-live="polite" aria-atomic="true">
                  {qty}
                </span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))} disabled={qty >= maxQty}>
                  +
                </button>
              </div>
              <button type="button" className="t14-btn t14-btn-lg t14-btn-grow" onClick={add} aria-disabled={soldOutAll}>
                {soldOutAll ? "Sold out" : "Add to cart"}
              </button>
            </div>
            {error ? (
              <p className="t14-form-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="t14-related" aria-labelledby="t14-related-h">
            <h2 id="t14-related-h" className="t14-h3">
              Related products
            </h2>
            <ul className="t14-grid">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}
