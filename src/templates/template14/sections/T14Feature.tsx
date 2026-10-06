"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatNaira } from "@/lib/shop/money";
import { useT14 } from "../ctx";
import { IconArrow } from "../icons";
import { categoryName, productHref } from "../shop/helpers";

const INTERVAL_MS = 5000;

/** Split card: product copy and an order button on the left, a crossfading photo carousel on the right. */
export default function T14Feature() {
  const { shop, baseUrl } = useT14();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const product = shop ? (shop.products.find((p) => p.featured) ?? shop.products[0] ?? null) : null;
  const count = product?.images.length ?? 0;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (!shop || !product) return null;
  const cat = categoryName(shop, product);
  const desc = (product.description ?? "").replace(/\s+/g, " ").trim();
  const blurb = desc.length > 160 ? `${desc.slice(0, 160).trimEnd()}…` : desc;
  const current = Math.min(index, Math.max(count - 1, 0));

  return (
    <section className="t14-feat t14-container t14-reveal" aria-labelledby="t14-feat-h">
      <div className="t14-feat-copy t14-paper">
        <h2 id="t14-feat-h" className="t14-h2">
          {product.name}.
          {cat ? (
            <>
              <br />
              <span className="t14-dim">{cat}</span>
            </>
          ) : null}
        </h2>
        {blurb ? <p className="t14-feat-text">{blurb}</p> : null}
        <Link className="t14-pill t14-pill-black t14-pill-lg t14-pill-block t14-feat-order" href={productHref(baseUrl, product)}>
          Order <IconArrow size={16} /> {formatNaira(product.priceKobo)}
        </Link>
      </div>

      <div
        className="t14-feat-media"
        role="group"
        aria-roledescription="carousel"
        aria-label={`${product.name} photos`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {product.images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${img.url}-${i}`}
            className="t14-feat-img"
            src={img.url}
            alt={i === current ? img.alt || product.name : ""}
            aria-hidden={i === current ? undefined : true}
            data-active={i === current}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {count > 1 ? (
          <div className="t14-feat-dots">
            {product.images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                data-active={i === current}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
