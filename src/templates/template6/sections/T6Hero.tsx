"use client";

import { useState, type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink } from "@/templates/shared/links";
import { propertiesHref, useT6 } from "../ctx";
import { IconArrow } from "../icons";

const MODES = ["Buy", "Rent", "Sell"] as const;
const TYPES = ["Any type", "Apartment", "Terrace", "Duplex", "Detached house", "Land", "Commercial"];

function Plate({ src, alt, fallback }: { src?: string; alt?: string; fallback: string }) {
  return (
    <div className="t6-plate-img">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || ""} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

/**
 * Catalogue-style real-estate heroes, one per page (light and dark mode):
 *  - home: giant right-aligned wordmark, two image plates with captions, inline search
 *  - about: text column beside a tall captioned plate, numbered facts
 *  - contact: "Visit us" — address as headline, office details, plate
 *  - extra pages: catalogue header with mode/type filter links
 * Later heroes on a page render as a compact statement.
 */
export default function T6Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT6();
  const { photos, profile, listings, pageKind, pageLabel, baseUrl } = ctx;
  const { set } = useSectionEditor(section, sectionIndex);
  const [mode, setMode] = useState<(typeof MODES)[number]>("Buy");

  const headline = section.headline || "Find a home that fits the life you want";
  const subtext =
    section.subtext ||
    `${profile.business_name} helps you buy, sell and rent with verified listings, honest advice and a team that knows every neighbourhood.`;
  const ctaText = section.ctaText || "Browse properties";
  const mono = initials(profile.business_name);
  const titles = listings.length ? listings : ["Four-bedroom family home", "Modern city apartment", "Serviced plot"];

  const title = (cls: string) => (
    <EditableText as="h1" className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead = <EditableText as="p" className="t6-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />;
  const cta = (
    <a className="t6-btn" href={section.ctaHref || propertiesHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow />
    </a>
  );

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams({ interest: mode });
    for (const k of ["location", "type"]) {
      const v = String(data.get(k) || "");
      if (v && !v.startsWith("Any")) params.set(k, v);
    }
    window.location.href = `${propertiesHref(ctx)}?${params.toString()}`;
  }

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const facts = [
      { k: "Est.", v: String(new Date().getFullYear() - 8) },
      { k: "Listings", v: `${Math.max(titles.length, 3)}+` },
      { k: "Based in", v: profile.address?.split(",").slice(-1)[0]?.trim() || "Lagos" },
    ];
    return (
      <section className="t6-hero t6-hero-about">
        <div className="t6-container t6-about-hero">
          <div className="t6-about-text t6-reveal">
            <span className="t6-caption">About {profile.business_name}</span>
            {title("t6-h1")}
            {lead}
            <dl className="t6-facts">
              {facts.map((f) => (
                <div key={f.k}>
                  <dt>{f.k}</dt>
                  <dd>{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="t6-plate t6-plate-tall t6-reveal">
            <Plate src={photos[1]?.url ?? photos[0]?.url} alt={photos[1]?.alt} fallback={mono} />
            <figcaption>{photos[1]?.alt || `The ${profile.business_name} team on site.`}</figcaption>
          </figure>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    return (
      <section className="t6-hero t6-hero-contact">
        <div className="t6-container t6-contact-hero">
          <div className="t6-reveal">
            <span className="t6-caption">Visit the office</span>
            <h1 className="t6-h1 t6-address-title">{profile.address || headline}</h1>
            {lead}
            <ul className="t6-office">
              {profile.phone ? (
                <li>
                  <span>Phone</span>
                  <a href={buildTelLink(profile.phone)}>{profile.phone}</a>
                </li>
              ) : null}
              {profile.email ? (
                <li>
                  <span>Email</span>
                  <a href={buildEmailLink(profile.email)}>{profile.email}</a>
                </li>
              ) : null}
              <li>
                <span>Hours</span>
                <b>Mon–Sat, 9:00–18:00</b>
              </li>
            </ul>
          </div>
          <figure className="t6-plate t6-reveal">
            <Plate src={photos[2]?.url ?? photos[0]?.url} alt={photos[2]?.alt} fallback={mono} />
            <figcaption>Private viewings by appointment.</figcaption>
          </figure>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const types = TYPES.slice(1, 6);
    return (
      <section className="t6-hero t6-hero-page">
        <div className="t6-container t6-reveal">
          <div className="t6-catalog-head">
            <div>
              <span className="t6-caption">
                {profile.business_name} / {pageLabel || "Catalogue"}
              </span>
              {title("t6-h1")}
            </div>
            <span className="t6-count">({pad2(titles.length)})</span>
          </div>
          <div className="t6-catalog-bar">
            {lead}
            <nav className="t6-filters" aria-label="Filter">
              {MODES.map((m) => (
                <a key={m} href={`${propertiesHref(ctx)}?interest=${m}`}>
                  {m}
                </a>
              ))}
              <i aria-hidden="true" />
              {types.map((t) => (
                <a key={t} href={`${propertiesHref(ctx)}?type=${encodeURIComponent(t)}`}>
                  {t}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t6-hero t6-hero-plain">
        <div className="t6-container t6-reveal">
          {title("t6-h2")}
          <div className="t6-catalog-bar">
            {lead}
            {cta}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="t6-hero t6-hero-home">
      <div className="t6-container">
        <div className="t6-wordmark t6-reveal" aria-hidden="true">
          {profile.business_name}
        </div>

        <div className="t6-plates t6-reveal">
          <figure className="t6-plate">
            <Plate src={photos[0]?.url} alt={photos[0]?.alt} fallback={mono} />
            <figcaption>
              {title("t6-plate-title")}
              {lead}
              <span className="t6-plate-actions">
                {cta}
                <a className="t6-textlink" href={`${baseUrl}/contact`}>
                  Book a private viewing
                </a>
              </span>
            </figcaption>
          </figure>
          <figure className="t6-plate">
            <Plate src={photos[1]?.url} alt={photos[1]?.alt} fallback={pad2(1)} />
            <figcaption>
              <b>New listing.</b> {titles[0]} — {photos[1]?.alt || "available now for viewings."}{" "}
              <a className="t6-textlink" href={propertiesHref(ctx)}>
                See all {titles.length} listings
              </a>
            </figcaption>
          </figure>
        </div>

        <form className="t6-search" onSubmit={onSearch} aria-label="Search properties">
          <div className="t6-search-tabs" role="group" aria-label="I want to">
            {MODES.map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
          <input name="location" placeholder="Area, district or city" aria-label="Location" />
          <select name="type" defaultValue={TYPES[0]} aria-label="Property type">
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="t6-search-go">
            Search <IconArrow size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}
