"use client";

import Link from "next/link";

import type { BackedBySection } from "@/lib/pageSchema";
import { useT14 } from "../ctx";
import { IconGrid } from "../icons";

function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(url);
}

/**
 * White rounded lip that overlaps the bottom of the home hero. Shows category chips, or the page's
 * "backed by" logos when it has that section. Home only, live shop with products only.
 */
export default function T14Strip({ backedBy }: { backedBy?: BackedBySection | null }) {
  const { shop, baseUrl } = useT14();
  if (!shop || shop.products.length === 0) return null;

  const logos = (backedBy?.logos ?? []).filter((l) => l.name?.trim() || isImageUrl(l.url));
  if (backedBy && logos.length > 0) {
    return (
      <section className="t14-strip" aria-labelledby="t14-strip-h">
        <div className="t14-container t14-reveal">
          <h2 id="t14-strip-h">{backedBy.title || "As seen in"}</h2>
          <ul className="t14-strip-row t14-strip-logos">
            {logos.map((l, i) => (
              <li key={i}>
                {isImageUrl(l.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.url} alt={l.name || "Logo"} />
                ) : (
                  <span>{l.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const counts = new Map<string, number>();
  for (const p of shop.products) if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  const cats = [...shop.categories].filter((c) => counts.has(c.id)).sort((a, b) => a.position - b.position);
  if (cats.length === 0) return null;

  return (
    <section className="t14-strip" aria-labelledby="t14-strip-h">
      <div className="t14-container t14-reveal">
        <h2 id="t14-strip-h">Everything you need, in one place.</h2>
        <ul className="t14-strip-row">
          {cats.map((c) => (
            <li key={c.id}>
              <Link className="t14-chip t14-strip-chip" href={`${baseUrl}/shop/c/${c.slug}`}>
                <IconGrid size={14} /> {c.name} <small>{counts.get(c.id)}</small>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
