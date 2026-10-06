"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { formatNaira } from "@/lib/shop/money";
import type { ShopProduct } from "@/lib/shop/types";
import { buildWhatsAppLink } from "@/templates/shared/links";
import { cityOf, shopHref, useT14 } from "../ctx";
import { IconArrow, IconChat, IconCheck, IconChevron, IconChevronDown, IconLock, IconMinus, IconPlus, IconStore, IconTruck } from "../icons";
import { bestValueVariantId, savingKobo } from "../lib";
import T14Rail from "../sections/T14Rail";
import {
  categoryName,
  findVariant,
  optionAvailable,
  optionGroups,
  productSoldOut,
  stockOf,
  unitPrice,
  variantInStock,
  type OptionGroup,
} from "./helpers";

/** First sentence of the description, used as the page lead. */
function leadOf(text: string | null): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = t.match(/^(.+?[.!?])(?:\s|$)/);
  const s = m ? m[1] : t;
  if (s.length <= 180) return s;
  return `${s.slice(0, 177).replace(/\s+\S*$/, "")}…`;
}

function Description({ text }: { text: string | null }) {
  const paras = (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return null;
  return (
    <div className="t14-pdp-desc">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** Product page laid out like a configurator: gallery card on the left, option rows and the total on the right. */
export default function ProductPage({ product }: { product: ShopProduct }) {
  const { baseUrl, shop, cart, openCart, announce, profile } = useT14();
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
  const swipe = useRef<number | null>(null);

  const variant = findVariant(product, selected);
  const hasVariants = product.variants.length > 0;
  const soldOutAll = productSoldOut(product);
  const stock = hasVariants ? (variant ? stockOf(variant) : null) : { kind: "in" as const };
  const price = unitPrice(product, variant);
  const saving = savingKobo(price, product.compareAtKobo);
  const inBag = cart.lines
    .filter((l) => l.productId === product.id && l.variantId === (variant?.id ?? null))
    .reduce((n, l) => n + l.quantity, 0);
  const maxQty = variant && variant.stock !== null ? Math.max(0, variant.stock - inBag) : 99;
  const cat = shop ? categoryName(shop, product) : null;
  const category = shop?.categories.find((c) => c.id === product.categoryId) ?? null;
  const images = product.images;
  const at = Math.min(imgIdx, Math.max(0, images.length - 1));
  const current = images[at];
  const settings = shop?.settings;
  const fee = settings?.deliveryFeeKobo ?? 0;
  const pickup = !!settings?.pickupEnabled;
  const city = cityOf(profile.address);
  const lead = leadOf(product.description);
  const hasMore = (product.description ?? "").replace(/\s+/g, " ").trim().length > lead.length + 2;

  const single = groups.length === 1 && groups[0].values.length <= 5;
  const bestId = bestValueVariantId(product.variants, product.priceKobo, product.compareAtKobo);

  const related = useMemo(() => {
    if (!shop) return { items: [] as ShopProduct[], same: false };
    const same = shop.products.filter((p) => p.id !== product.id && p.categoryId && p.categoryId === product.categoryId);
    if (same.length > 0) return { items: same, same: true };
    return { items: shop.products.filter((p) => p.id !== product.id), same: false };
  }, [shop, product]);

  const pick = (name: string, value: string) => {
    setSelected((s) => ({ ...s, [name]: value }));
    setError(null);
    setQty(1);
  };

  const go = (dir: 1 | -1) => {
    if (images.length < 2) return;
    setImgIdx((at + dir + images.length) % images.length);
  };

  const add = () => {
    if (soldOutAll) return;
    const missing = groups.find((g) => !selected[g.name]);
    if (missing) {
      setError(`Please choose a ${missing.name.toLowerCase()}.`);
      const grp = [...(formRef.current?.querySelectorAll<HTMLElement>("[data-optgroup]") ?? [])].find((el) => el.dataset.optgroup === missing.name);
      grp?.querySelector<HTMLElement>('[role="radio"]:not([aria-disabled="true"])')?.focus();
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

  // Radio semantics: arrows move the selection to the next available value (wrapping), Home and End jump.
  const onRadioKey = (e: ReactKeyboardEvent<HTMLElement>, g: OptionGroup) => {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const enabled = g.values.filter((v) => optionAvailable(product, selected, g.name, v));
    if (!enabled.length) return;
    const i = enabled.indexOf(selected[g.name] ?? "");
    let next: string;
    if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    else if (forward) next = enabled[(i + 1) % enabled.length];
    else next = enabled[i <= 0 ? enabled.length - 1 : i - 1];
    pick(g.name, next);
    const radios = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    [...(radios ?? [])].find((el) => el.dataset.val === next)?.focus();
  };

  const stockLabel = soldOutAll || stock?.kind === "out" ? "Sold out" : stock?.kind === "low" ? `Only ${stock.left} left` : "In stock";
  const stockState = soldOutAll || stock?.kind === "out" ? "out" : stock?.kind === "low" ? "low" : "in";
  const unavailable = soldOutAll;
  const needsChoice = !unavailable && groups.some((g) => !selected[g.name]);
  const noun = product.name.split(/\s+/).slice(0, 3).join(" ");
  const heading = /[.!?]$/.test(product.name.trim()) ? product.name.trim() : `${product.name.trim()}.`;

  const firstVal = (g: OptionGroup) => {
    const enabled = g.values.filter((v) => optionAvailable(product, selected, g.name, v));
    return selected[g.name] && enabled.includes(selected[g.name]) ? selected[g.name] : enabled[0];
  };

  return (
    <section className="t14-pdp t14-shop-page">
      <div className="t14-container">
        <header className="t14-pdp-head">
          <nav className="t14-crumbs" aria-label="Breadcrumb">
            <Link href={shopHref(baseUrl)}>Shop</Link>
            {cat && category ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`${baseUrl}/shop/c/${category.slug}`}>{cat}</Link>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span aria-current="page">{product.name}</span>
          </nav>
          <h1 className="t14-pdp-h1">{heading}</h1>
          {lead ? <p className="t14-pdp-lead">{lead}</p> : null}
        </header>

        <div className="t14-pdp-grid">
          <div className="t14-pdp-gal">
            <div
              className="t14-pdp-stage"
              onPointerDown={(e) => {
                swipe.current = e.clientX;
              }}
              onPointerUp={(e) => {
                const x = swipe.current;
                swipe.current = null;
                if (x === null) return;
                const dx = e.clientX - x;
                if (Math.abs(dx) >= 40) go(dx < 0 ? 1 : -1);
              }}
              onPointerCancel={() => {
                swipe.current = null;
              }}
            >
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={current.url} src={current.url} alt={current.alt || product.name} loading="eager" fetchPriority="high" draggable={false} />
              ) : (
                <span className="t14-pdp-noimg" aria-hidden="true">
                  {product.name.slice(0, 1)}
                </span>
              )}
              {images.length > 1 ? (
                <>
                  <button type="button" className="t14-pdp-nav t14-pdp-prev" aria-label="Previous photo" onClick={() => go(-1)}>
                    <IconChevron size={16} />
                  </button>
                  <button type="button" className="t14-pdp-nav t14-pdp-next" aria-label="Next photo" onClick={() => go(1)}>
                    <IconChevron size={16} />
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <ul className="t14-pdp-thumbs" aria-label="Product photos">
                {images.map((im, i) => (
                  <li key={im.url + i}>
                    <button
                      type="button"
                      aria-label={`Show photo ${i + 1} of ${images.length}`}
                      aria-pressed={i === at}
                      onClick={() => setImgIdx(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="t14-pdp-conf" ref={formRef}>
            <div className="t14-pdp-row1">
              <h2 className="t14-pdp-your">Your {noun}</h2>
              <p className="t14-pdp-stock" data-state={stockState} aria-live="polite">
                <i aria-hidden="true" />
                {stockLabel}
              </p>
            </div>

            {!single ? (
              <p className="t14-pdp-priceline">
                <b>{formatNaira(price)}</b>
                {saving > 0 ? (
                  <>
                    <s>
                      <span className="t14-sr">Was </span>
                      {formatNaira(product.compareAtKobo ?? 0)}
                    </s>
                    <span className="t14-opt-save">Save {formatNaira(saving)}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {single ? (
              <div className="t14-opts" role="radiogroup" aria-label={groups[0].name} data-optgroup={groups[0].name}>
                {groups[0].values.map((val) => {
                  const g = groups[0];
                  const v = product.variants.find((x) => x.options[g.name] === val) ?? null;
                  const ok = optionAvailable(product, selected, g.name, val);
                  const checked = selected[g.name] === val;
                  const p = v ? unitPrice(product, v) : product.priceKobo;
                  const save = savingKobo(p, product.compareAtKobo);
                  const st = stockOf(v);
                  const sub = !ok || st.kind === "out" ? "Sold out" : st.kind === "low" ? `Only ${st.left} left` : null;
                  return (
                    <button
                      key={val}
                      type="button"
                      role="radio"
                      className="t14-opt"
                      aria-checked={checked}
                      aria-disabled={!ok}
                      data-val={val}
                      tabIndex={checked || (!selected[g.name] && val === firstVal(g)) ? 0 : -1}
                      onClick={() => ok && pick(g.name, val)}
                      onKeyDown={(e) => onRadioKey(e, g)}
                    >
                      {v && bestId === v.id ? <span className="t14-opt-tag">Best value</span> : null}
                      <span>
                        <span className="t14-opt-name">{val}</span>
                        {sub ? <span className="t14-opt-sub">{sub}</span> : null}
                      </span>
                      <span className="t14-opt-price">
                        {save > 0 ? <span className="t14-opt-save">Save {formatNaira(save)}</span> : null}
                        <span>
                          {save > 0 ? (
                            <s>
                              <span className="t14-sr">Was </span>
                              {formatNaira(product.compareAtKobo ?? 0)}
                            </s>
                          ) : null}
                          {formatNaira(p)}
                        </span>
                      </span>
                      <span className="t14-opt-check" aria-hidden="true">
                        {checked ? <IconCheck size={13} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.name} className="t14-seg-group">
                  <p className="t14-seg-label">
                    {g.name}
                    {selected[g.name] ? <span>{selected[g.name]}</span> : null}
                  </p>
                  <div className="t14-seg" role="radiogroup" aria-label={g.name} data-optgroup={g.name}>
                    {g.values.map((val) => {
                      const ok = optionAvailable(product, selected, g.name, val);
                      const checked = selected[g.name] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          role="radio"
                          className="t14-seg-opt"
                          aria-checked={checked}
                          aria-disabled={!ok}
                          data-val={val}
                          tabIndex={checked || (!selected[g.name] && val === firstVal(g)) ? 0 : -1}
                          onClick={() => ok && pick(g.name, val)}
                          onKeyDown={(e) => onRadioKey(e, g)}
                        >
                          {val}
                          {!ok ? <span className="t14-sr"> (sold out)</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="t14-pdp-qty">
              <span id="t14-qty-l">Quantity</span>
              <div className="t14-step" role="group" aria-labelledby="t14-qty-l">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <IconMinus size={14} />
                </button>
                <span className="t14-step-n" aria-live="polite" aria-atomic="true">
                  {qty}
                </span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))} disabled={qty >= maxQty}>
                  <IconPlus size={14} />
                </button>
              </div>
            </div>

            <dl className="t14-pdp-sum">
              <div>
                <dt>Delivery</dt>
                <dd>{fee > 0 ? formatNaira(fee) : "Free"}</dd>
              </div>
              {pickup ? (
                <div>
                  <dt>Pickup</dt>
                  <dd>Available</dd>
                </div>
              ) : null}
              <div className="t14-pdp-total">
                <dt>Total</dt>
                <dd>{formatNaira(price * qty)}</dd>
              </div>
            </dl>
            {fee > 0 ? <p className="t14-pdp-fine">Delivery added at checkout</p> : null}

            {error ? (
              <p className="t14-pdp-err" role="alert">
                {error}
              </p>
            ) : null}

            <button type="button" className="t14-pill t14-pill-black t14-pill-xl t14-pill-block" onClick={add} aria-disabled={unavailable || needsChoice}>
              {unavailable ? (
                "Sold out"
              ) : needsChoice ? (
                "Choose an option"
              ) : (
                <>
                  Add to bag <IconArrow size={18} />
                </>
              )}
            </button>

            <div className="t14-pdp-status" data-state={stockState}>
              <i aria-hidden="true" />
              <p>
                <b>{stockState === "out" ? "Sold out" : stockState === "low" ? "Low stock" : "In stock"}</b>
                {city ? <span>Ships from {city}</span> : null}
              </p>
            </div>

            {profile.whatsapp ? (
              <a className="t14-pdp-wa" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                Questions? Chat on WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <ul className="t14-pdp-trust" aria-label="Why shop here">
          <li>
            <IconLock size={16} /> Secure Paystack checkout
          </li>
          {pickup ? (
            <li>
              <IconStore size={16} /> Pickup available
            </li>
          ) : null}
          {fee > 0 ? (
            <li>
              <IconTruck size={16} /> Delivery from {formatNaira(fee)}
            </li>
          ) : null}
          {profile.whatsapp ? (
            <li>
              <IconChat size={16} /> WhatsApp support
            </li>
          ) : null}
        </ul>

        <div className="t14-pdp-info">
          <div className="t14-pdp-cells" data-n={pickup ? 2 : 1}>
            <div>
              <p className="t14-pdp-cell-t">Delivery</p>
              <p>{fee > 0 ? `${formatNaira(fee)}, added at checkout` : "Free delivery"}</p>
            </div>
            {pickup ? (
              <div>
                <p className="t14-pdp-cell-t">Pickup</p>
                <p>{settings?.pickupNote || "Available at checkout"}</p>
              </div>
            ) : null}
          </div>
          {hasMore ? (
            <details className="t14-pdp-acc" open>
              <summary>
                Product details <IconChevronDown size={16} />
              </summary>
              <Description text={product.description} />
            </details>
          ) : null}
          <details className="t14-pdp-acc">
            <summary>
              Delivery &amp; returns <IconChevronDown size={16} />
            </summary>
            <div className="t14-pdp-desc">
              <p>{fee > 0 ? `Delivery costs ${formatNaira(fee)} and is added at checkout.` : "Delivery is free."}</p>
              {pickup ? <p>{settings?.pickupNote ? `Pickup: ${settings.pickupNote}` : "You can also pick your order up. Choose pickup at checkout."}</p> : null}
              {profile.phone || profile.email || profile.whatsapp ? <p>Questions? Get in touch and we will help.</p> : null}
            </div>
          </details>
        </div>
      </div>

      {related.items.length > 0 ? (
        <T14Rail
          products={related.items}
          id="t14-pdp-rail"
          onPaper
          heading={["You may also like.", related.same && cat ? `More from ${cat}.` : "More from the shop."]}
        />
      ) : null}
    </section>
  );
}
