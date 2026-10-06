"use client";

import Link from "next/link";

import { shopHref, useT7 } from "../ctx";
import { IconBag } from "../icons";
import ProductCard from "./ProductCard";

/**
 * The order page: sticky glass category pills over a menu grouped by category, each dish a photo
 * card with a one-tap "Add". A category route (/shop/c/<slug>) shows just that course.
 */
export default function OrderMenu({ categorySlug }: { categorySlug?: string }) {
  const { shop, baseUrl, profile } = useT7();
  if (!shop) return null;

  const cats = [...shop.categories].sort((a, b) => a.position - b.position);
  const active = categorySlug ? cats.find((c) => c.slug === categorySlug) ?? null : null;
  const byPos = [...shop.products].sort((a, b) => a.position - b.position);
  const groups = (active ? [active] : cats)
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, items: byPos.filter((p) => p.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);
  const loose = active ? [] : byPos.filter((p) => !p.categoryId || !cats.some((c) => c.id === p.categoryId));
  if (loose.length) groups.push({ id: "more", slug: "more", name: cats.length ? "More" : "Menu", items: loose });

  const { deliveryFeeKobo, pickupEnabled } = shop.settings;

  return (
    <section className="t7-section t7-ordermenu">
      <div className="t7-container">
        <header className="t7-order-head t7-reveal">
          <span className="t7-eyebrow">Order online</span>
          <h1 className="t7-h1">{active ? active.name : `Order from ${profile.business_name}`}</h1>
          <p className="t7-lead">
            Pick your dishes, pay securely online and choose
            {pickupEnabled ? " delivery or pickup." : " delivery to your door."}
            {deliveryFeeKobo === 0 ? " Delivery is free." : ""}
          </p>
        </header>

        {cats.length > 1 ? (
          <nav className="t7-order-tabs" aria-label="Menu categories">
            <Link href={shopHref(baseUrl)} data-active={!active} aria-current={!active ? "page" : undefined}>
              All
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`${shopHref(baseUrl)}/c/${c.slug}`}
                data-active={active?.id === c.id}
                aria-current={active?.id === c.id ? "page" : undefined}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {groups.length === 0 ? (
          <div className="t7-empty t7-glass">
            <span className="t7-empty-ico" aria-hidden="true">
              <IconBag size={34} />
            </span>
            <p className="t7-empty-title">The online menu is being prepared</p>
            <p className="t7-muted">Call us to order in the meantime.</p>
          </div>
        ) : (
          groups.map((g, gi) => (
            <section key={g.id} id={`course-${g.slug}`} className="t7-course" aria-labelledby={`t7-course-${g.slug}`}>
              <h2 id={`t7-course-${g.slug}`} className="t7-course-title">
                <span>{String(gi + 1).padStart(2, "0")}</span> {g.name}
              </h2>
              <ul className="t7-dishes">
                {g.items.map((p, i) => (
                  <li key={p.id} className="t7-reveal">
                    <ProductCard product={p} priority={gi === 0 && i < 3} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
