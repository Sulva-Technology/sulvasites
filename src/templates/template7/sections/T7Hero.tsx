"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink } from "@/templates/shared/links";
import T7Hours from "../components/T7Hours";
import { cityOf, directionsHref, menuHref, reserveHref, shopHref, useT7 } from "../ctx";
import { IconArrow, IconClock, IconMail, IconPhone, IconPin, Ornament } from "../icons";

function Photo({ src, alt, fallback, eager }: { src?: string; alt?: string; fallback: string; eager?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} loading={eager ? "eager" : "lazy"} />
  ) : (
    <span className="t7-photo-fallback" aria-hidden="true">
      {fallback}
    </span>
  );
}

/**
 * Restaurant heroes, one per page kind:
 *  - home: full-bleed food photo, name set large, info strip, reserve + menu CTAs
 *  - about: split arched photo / story
 *  - contact: visit details beside an hours card (the form follows in contact_card)
 *  - extra pages: centred menu-card heading over a wide photo band
 * Later heroes on a page render as a centred statement.
 */
export default function T7Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT7();
  const { photos, profile, pageKind, pageLabel, hours } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  const headline = section.headline || "Good food, warm rooms, long tables";
  const subtext = section.subtext || profile.tagline || "";
  const ctaText = section.ctaText || "Reserve a table";
  const mono = initials(profile.business_name);
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") => (
    <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead =
    subtext || enabled ? (
      <EditableText as="p" className="t7-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t7-btn") => (
    <a className={cls} href={section.ctaHref || reserveHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={16} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const photo = photos[0];
    return (
      <section className="t7-hero t7-hero-about">
        <div className="t7-container t7-split">
          <figure className="t7-arch t7-reveal">
            <div className="t7-arch-frame">
              <Photo src={photo?.url} alt={photo?.alt} fallback={mono} eager />
            </div>
            {photo?.alt ? <figcaption>{photo.alt}</figcaption> : null}
          </figure>
          <div className="t7-split-text t7-reveal">
            <span className="t7-eyebrow">
              <Ornament /> Our story
            </span>
            {title("t7-h1")}
            {lead}
            <div className="t7-signoff">
              <span className="t7-signoff-name">{profile.business_name}</span>
              {city ? <span>{city}</span> : null}
            </div>
            <div className="t7-actions">
              {cta()}
              <a className="t7-textlink" href={menuHref(ctx)}>
                See the menu <IconArrow size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    return (
      <section className="t7-hero t7-hero-contact">
        <div className="t7-container t7-visit">
          <div className="t7-visit-text t7-reveal">
            <span className="t7-eyebrow">
              <Ornament /> Visit &amp; reserve
            </span>
            {title("t7-h1")}
            {lead}
            <ul className="t7-visit-list">
              {profile.address ? (
                <li>
                  <span className="t7-visit-ico"><IconPin /></span>
                  <span>
                    <small>Address</small>
                    {profile.address}
                    <a className="t7-textlink" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                      Open in Maps <IconArrow size={14} />
                    </a>
                  </span>
                </li>
              ) : null}
              {profile.phone ? (
                <li>
                  <span className="t7-visit-ico"><IconPhone /></span>
                  <span>
                    <small>Phone</small>
                    <a href={buildTelLink(profile.phone)}>{profile.phone}</a>
                  </span>
                </li>
              ) : null}
              {profile.email ? (
                <li>
                  <span className="t7-visit-ico"><IconMail /></span>
                  <span>
                    <small>Email</small>
                    <a href={buildEmailLink(profile.email)}>{profile.email}</a>
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          <aside className="t7-hours-card t7-reveal" aria-label="Opening hours">
            <div className="t7-hours-card-head">
              <IconClock size={20} />
              <span>Opening hours</span>
            </div>
            {hours.length || enabled ? (
              <T7Hours />
            ) : (
              <p className="t7-muted">Call or send a request below and we&apos;ll let you know when we&apos;re open.</p>
            )}
            <a className="t7-btn" href="#reserve">
              Request a table <IconArrow size={16} />
            </a>
          </aside>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const band = photos.slice(0, 3);
    return (
      <section className="t7-hero t7-hero-page">
        <div className="t7-container t7-page-head t7-reveal">
          <span className="t7-rule-label">
            <i aria-hidden="true" />
            <span>{pageLabel || profile.business_name}</span>
            <i aria-hidden="true" />
          </span>
          {title("t7-h1")}
          {lead}
          <div className="t7-actions t7-actions-center">
            {cta()}
            {profile.phone ? (
              <a className="t7-btn t7-btn-ghost" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>
        {band.length ? (
          <div className="t7-page-band t7-reveal" data-count={band.length}>
            {band.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.url} src={p.url} alt={p.alt} loading={i === 0 ? "eager" : "lazy"} />
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t7-hero t7-hero-plain">
        <div className="t7-container t7-statement t7-reveal">
          <Ornament size={14} />
          {title("t7-h2", "h2")}
          {lead}
          <div className="t7-actions t7-actions-center">{cta()}</div>
        </div>
      </section>
    );
  }

  const photo = photos[0];
  const strip = [
    profile.address ? { key: "where", label: "Find us", value: profile.address, href: directionsHref(profile.address), ext: true } : null,
    hours.length ? { key: "hours", label: "Hours", value: hours.slice(0, 2).join("\n"), href: null, ext: false } : null,
    profile.phone ? { key: "call", label: "Reservations", value: profile.phone, href: buildTelLink(profile.phone), ext: false } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <section className="t7-hero t7-hero-home" data-photo={!!photo}>
      <div className="t7-hero-media">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={photo.alt || ""} loading="eager" />
        ) : (
          <span className="t7-hero-mono" aria-hidden="true">
            {mono}
          </span>
        )}
      </div>
      <div className="t7-container t7-hero-content">
        <span className="t7-eyebrow t7-eyebrow-light t7-reveal">
          <Ornament /> Welcome to
        </span>
        <p className="t7-hero-name t7-reveal">
          {profile.business_name}
        </p>
        <div className="t7-hero-copy t7-reveal">
          {title("t7-hero-title")}
          {lead}
          <div className="t7-actions">
            {cta("t7-btn t7-btn-cream")}
            {ctx.shop ? (
              <a className="t7-btn t7-btn-glass" href={shopHref(ctx.baseUrl)}>
                Order online
              </a>
            ) : (
              <a className="t7-btn t7-btn-glass" href={menuHref(ctx)}>
                View menu
              </a>
            )}
          </div>
        </div>
      </div>
      <a className="t7-scroll" href={menuHref(ctx)} aria-label="Scroll to the menu">
        <span>Scroll</span>
        <i aria-hidden="true" />
      </a>
      {strip.length ? (
        <div className="t7-strip">
          <div className="t7-container t7-strip-inner" data-count={strip.length}>
            {strip.map((s, i) =>
              s.href ? (
                <a key={s.key} className="t7-strip-item" href={s.href} target={s.ext ? "_blank" : undefined} rel={s.ext ? "noreferrer" : undefined}>
                  <small><b>{String(i + 1).padStart(2, "0")}</b>{s.label}</small>
                  <span>{s.value}</span>
                </a>
              ) : (
                <div key={s.key} className="t7-strip-item">
                  <small><b>{String(i + 1).padStart(2, "0")}</b>{s.label}</small>
                  <span>{s.value}</span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
