"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { formatNaira } from "@/lib/shop/money";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T14Hours from "../components/T14Hours";
import { directionsHref, shopHref, useT14 } from "../ctx";
import { IconArrow, IconChat, IconStore, IconMail, IconPhone, IconPin } from "../icons";
import { splitTwoTone } from "../lib";
import { productInStock } from "../shop/helpers";

/**
 * Heroes, one per page kind:
 *  - home: inset photo card, two-tone headline, delivery chip and stock status
 *  - about: paper band, story beside a tall portrait
 *  - contact: centred heading, four contact cards, opening hours
 *  - extra pages: crumb chips, headline and a wide photo band
 * Later heroes on a page render as a dark globe call-to-action band.
 */

const GLOBE_R = 560;
const GLOBE_CX = 600;
const GLOBE_CY = 700;
const MERIDIANS = Array.from({ length: 9 }, (_, i) => Math.abs(Math.cos((i * Math.PI) / 9)) * GLOBE_R);
const PARALLELS = Array.from({ length: 6 }, (_, i) => {
  const lat = ((i + 1) * Math.PI) / 14;
  const rx = Math.cos(lat) * GLOBE_R;
  return { cy: GLOBE_CY - Math.sin(lat) * GLOBE_R, rx, ry: rx * 0.16 };
});

function Globe() {
  return (
    <svg className="t14-globe" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <g fill="none" stroke="rgb(255 255 255 / .09)" strokeWidth="1">
        <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} />
        {MERIDIANS.map((rx, i) => (
          <ellipse key={`m${i}`} cx={GLOBE_CX} cy={GLOBE_CY} rx={rx} ry={GLOBE_R} />
        ))}
        {PARALLELS.map((p, i) => (
          <ellipse key={`p${i}`} cx={GLOBE_CX} cy={p.cy} rx={p.rx} ry={p.ry} />
        ))}
      </g>
    </svg>
  );
}

export default function T14Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, shop } = useT14();
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const fallbackHref = shop ? shopHref(baseUrl) : "";
  const ctaHref = section.ctaHref || fallbackHref;
  const ctaText = section.ctaText || (enabled ? "" : shop ? "Shop now" : "");
  const showCta = enabled || (!!ctaText && !!ctaHref);

  /** Two-tone H1 when reading; the plain multiline field while editing. */
  const twoTone = (cls: string): ReactNode => {
    if (enabled) {
      return (
        <EditableText
          as="h1"
          className={cls}
          value={headline}
          placeholder="Headline (press Enter for the dimmed first line)"
          multiline
          onCommit={(next) => set({ headline: next })}
        />
      );
    }
    const [a, b] = splitTwoTone(headline);
    return (
      <h1 className={cls}>
        {a ? <span className="t14-hero-dim">{a}</span> : null}
        {a ? <br /> : null}
        <span>{b}</span>
      </h1>
    );
  };
  const lead = (cls: string): ReactNode =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls: string): ReactNode =>
    showCta ? (
      <a className={cls} href={ctaHref || undefined}>
        <EditableText as="span" value={ctaText} placeholder="Shop now" onCommit={(next) => set({ ctaText: next })} />
        <IconArrow size={16} />
      </a>
    ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t14-aboutband t14-band t14-paper t14-on-paper">
        <div className="t14-container t14-ab-grid">
          <div className="t14-ab-text t14-reveal">
            {twoTone("t14-h1")}
            {lead("t14-lead")}
            {showCta ? <div className="t14-ab-cta">{cta("t14-pill t14-pill-black t14-pill-lg")}</div> : null}
          </div>
          <div className="t14-ab-photo t14-reveal" data-photo={!!a}>
            {a ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
            ) : (
              <span className="t14-photo-fallback" aria-hidden="true">
                <IconStore size={64} />
              </span>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const lines = [
      profile.phone ? { key: "call", icon: <IconPhone size={16} />, label: "Call", value: profile.phone, href: buildTelLink(profile.phone), ext: false } : null,
      profile.whatsapp ? { key: "wa", icon: <IconChat size={16} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true } : null,
      profile.email ? { key: "mail", icon: <IconMail size={16} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false } : null,
      profile.address ? { key: "visit", icon: <IconPin size={16} />, label: "Visit", value: profile.address, href: directionsHref(profile.address), ext: true } : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t14-ct">
        <div className="t14-container">
          <div className="t14-ct-head t14-on-paper t14-reveal">
            {twoTone("t14-h1")}
            {lead("t14-lead")}
          </div>
          {lines.length ? (
            <ul className="t14-ct-cards t14-reveal">
              {lines.map((t) => (
                <li key={t.key}>
                  <a className="t14-ct-card" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                    <span className="t14-ct-ico">{t.icon}</span>
                    <small>{t.label}</small>
                    <b>{t.value}</b>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {hours.length || enabled ? (
            <aside className="t14-ct-hours t14-reveal" aria-label="Opening hours">
              <h2 className="t14-h3">Opening hours</h2>
              <T14Hours />
            </aside>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const shot = photos[2] ?? photos[0];
    const label = pageLabel || profile.business_name;
    return (
      <section className="t14-xp">
        <div className="t14-container">
          <div className="t14-xp-head t14-on-paper t14-reveal">
            <nav className="t14-hcrumbs" aria-label="Breadcrumb">
              <Link className="t14-chip" href={`${baseUrl}/`}>
                Home
              </Link>
              <span aria-hidden="true">›</span>
              <span className="t14-chip" aria-current="page">
                {label}
              </span>
            </nav>
            {twoTone("t14-h1")}
            {lead("t14-lead")}
            {showCta ? <div className="t14-xp-cta">{cta("t14-pill t14-pill-black")}</div> : null}
          </div>
        </div>
        {shot ? (
          <figure className="t14-xp-photo t14-band t14-reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.url} alt={shot.alt || ""} loading="eager" fetchPriority="high" />
          </figure>
        ) : null}
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t14-cta">
        <div className="t14-cta-band t14-band t14-reveal">
          <Globe />
          <div className="t14-cta-dot" aria-hidden="true">
            <span className="t14-cta-beam" />
            <span className="t14-cta-ring">
              <i />
            </span>
          </div>
          <div className="t14-cta-copy">
            {enabled ? (
              <EditableText as="h2" className="t14-h2 t14-cta-title" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
            ) : (
              <h2 className="t14-h2 t14-cta-title">{headline}</h2>
            )}
            {lead("t14-cta-lead")}
            {showCta ? <div className="t14-cta-act">{cta("t14-pill t14-pill-white t14-pill-lg")}</div> : null}
          </div>
        </div>
      </section>
    );
  }

  // Home.
  const p0 = photos[0];
  const inStockCount = shop ? shop.products.filter(productInStock).length : 0;
  let deliveryChip = "";
  if (shop) {
    const { deliveryFeeKobo, pickupEnabled } = shop.settings;
    const delivery = deliveryFeeKobo > 0 ? `Delivery from ${formatNaira(deliveryFeeKobo)}` : "Free delivery";
    deliveryChip = pickupEnabled ? `Pickup available · ${delivery}` : delivery;
  }

  return (
    <section className="t14-hero" data-photo={!!p0}>
      <div className="t14-hero-card t14-band">
        {p0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="t14-hero-img" src={p0.url} alt={p0.alt || ""} loading="eager" fetchPriority="high" />
        ) : null}
        <div className="t14-hero-shade" aria-hidden="true" />
        <div className="t14-container t14-hero-inner">
          {shop ? <span className="t14-pill-glass t14-hero-chip">{deliveryChip}</span> : null}
          <div className="t14-hero-grid">
            {twoTone("t14-h1 t14-hero-title")}
            <div>
              {lead("t14-hero-lead")}
              {showCta || shop ? (
                <div className="t14-hero-ctas">
                  {cta("t14-pill t14-pill-white")}
                  {shop ? (
                    <a className="t14-pill t14-pill-glass" href="#t14-showcase">
                      See what’s new
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {shop && inStockCount > 0 ? (
          <span className="t14-pill-glass t14-hero-status">
            <i aria-hidden="true" /> {inStockCount} {inStockCount === 1 ? "product" : "products"} in stock
          </span>
        ) : null}
      </div>
    </section>
  );
}
