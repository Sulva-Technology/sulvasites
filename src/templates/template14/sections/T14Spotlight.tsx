"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useT14 } from "../ctx";
import { IconArrow } from "../icons";
import { productHref } from "../shop/helpers";

/** Full-height object spotlight: one product scales and straightens as it scrolls into view. */
export default function T14Spotlight() {
  const { shop, baseUrl } = useT14();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const product = shop
    ? (shop.products.find((p) => p.featured && p.images.length > 0) ?? shop.products.find((p) => p.images.length > 0) ?? null)
    : null;
  const has = !!product;

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!has || !section || !stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section's top meets the viewport bottom, 1 when it is centred.
      const raw = ((vh - r.top) / (vh + r.height)) * 2;
      const t = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
      stage.style.setProperty("--s", String(0.86 + 0.14 * t));
      stage.style.setProperty("--r", `${-6 * (1 - t)}deg`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [has]);

  if (!shop || !product) return null;
  const img = product.images[0]!;
  const short = product.name.trim().split(/\s+/).slice(0, 3).join(" ");

  return (
    <section ref={sectionRef} className="t14-spot" aria-labelledby="t14-spot-h">
      <div ref={stageRef} className="t14-spot-stage">
        <span className="t14-spot-shadow" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="t14-spot-obj" src={img.url} alt={img.alt || product.name} />
      </div>
      <h2 id="t14-spot-h" className="t14-h2">
        Order your {short}.
      </h2>
      <Link className="t14-pill t14-pill-black t14-pill-lg" href={productHref(baseUrl, product)}>
        Order <IconArrow size={16} />
      </Link>
    </section>
  );
}
