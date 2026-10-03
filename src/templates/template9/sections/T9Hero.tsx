"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T9Hours from "../components/T9Hours";
import { cityOf, directionsHref, joinHref, useT9 } from "../ctx";
import { IconArrow, IconChat, IconClock, IconDumbbell, IconMail, IconPhone, IconPin, IconStar } from "../icons";

/** Scrolling band of class names (static when motion is off or reduced). */
export function T9Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  // Repeat the list so one copy is ~2× a 2560px viewport: at least 12 entries and roughly
  // 280 characters of names (≈15px per character at the marquee's largest size).
  const chars = items.reduce((n, t) => n + t.length + 4, 0);
  const repeats = Math.max(Math.ceil(12 / items.length), Math.ceil(280 / Math.max(1, chars)), 1);
  const row = Array.from({ length: repeats }, () => items).flat();
  const copy = (dup: boolean) => (
    <ul className="t9-marquee-copy" data-dup={dup || undefined}>
      {row.map((t, i) => (
        <li key={i}>
          <span>{t}</span>
          <IconStar size={18} />
        </li>
      ))}
    </ul>
  );
  // Decorative: the services section carries the same content for assistive tech.
  return (
    <div className="t9-marquee" aria-hidden="true">
      <div className="t9-marquee-track">
        {copy(false)}
        {copy(true)}
      </div>
    </div>
  );
}

/**
 * Fitness heroes, one per page kind:
 *  - home: full-bleed dark photo, giant condensed headline, "Start free trial", class marquee
 *  - about: black band, story beside a stacked photo with a red block
 *  - contact: huge headline with call / message / visit tiles and an hours board
 *  - extra pages: black band with breadcrumb, outlined page label and a slanted photo
 * Later heroes on a page render as a red slanted call-to-action band.
 */
export default function T9Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT9();
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, classNames } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Start free trial");
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") => (
    <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead =
    subtext || enabled ? (
      <EditableText as="p" className="t9-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t9-btn") => (
    <a className={cls} href={section.ctaHref || joinHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );
  const callBtn = (cls = "t9-btn t9-btn-outline-light") =>
    profile.phone ? (
      <a className={cls} href={buildTelLink(profile.phone)}>
        <IconPhone size={16} /> {profile.phone}
      </a>
    ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t9-hero t9-hero-about t9-band">
        <div className="t9-container t9-about-grid">
          <div className="t9-about-text t9-reveal">
            <span className="t9-kicker">About {profile.business_name}</span>
            {title("t9-h1")}
            {lead}
            <div className="t9-actions">
              {cta()}
              <Link className="t9-textlink t9-textlink-light" href={`${baseUrl}/contact`}>
                Visit us <IconArrow size={16} />
              </Link>
            </div>
          </div>
          <div className="t9-about-media t9-reveal" data-photo={!!a}>
            <span className="t9-about-block" aria-hidden="true" />
            <div className="t9-about-photo">
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.alt || ""} loading="eager" />
              ) : (
                <span className="t9-photo-fallback" aria-hidden="true">
                  <IconDumbbell size={72} />
                </span>
              )}
            </div>
            {city ? (
              <span className="t9-about-tag">
                <IconPin size={16} /> {city}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const tiles = [
      profile.phone
        ? { key: "call", icon: <IconPhone size={22} />, label: "Call", value: profile.phone, href: buildTelLink(profile.phone), ext: false }
        : null,
      profile.whatsapp
        ? { key: "wa", icon: <IconChat size={22} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true }
        : null,
      profile.email
        ? { key: "mail", icon: <IconMail size={22} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false }
        : null,
      profile.address
        ? { key: "visit", icon: <IconPin size={22} />, label: "Visit", value: profile.address, href: directionsHref(profile.address), ext: true }
        : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t9-hero t9-hero-contact">
        <div className="t9-container">
          <div className="t9-contact-head t9-reveal">
            <span className="t9-kicker t9-kicker-dark">Contact</span>
            {title("t9-display")}
            {lead}
          </div>

          <div className="t9-contact-board" data-hours={hours.length > 0 || enabled}>
            {tiles.length ? (
              <ul className="t9-tiles" data-count={tiles.length}>
                {tiles.map((t) => (
                  <li key={t.key} className="t9-reveal">
                    <a className="t9-tile" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                      <span className="t9-tile-ico">{t.icon}</span>
                      <small>{t.label}</small>
                      <span className="t9-tile-value">{t.value}</span>
                      <span className="t9-tile-go" aria-hidden="true">
                        <IconArrow size={18} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {hours.length || enabled ? (
              <aside className="t9-hours-board t9-reveal" aria-label="Opening hours">
                <h2 className="t9-board-title">
                  <IconClock size={20} /> Opening hours
                </h2>
                <T9Hours />
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const photo = photos[2] ?? photos[0];
    const label = pageLabel || profile.business_name;
    return (
      <section className="t9-hero t9-hero-page t9-band" data-photo={!!photo}>
        <span className="t9-ghost" aria-hidden="true">
          {label}
        </span>
        <div className="t9-container t9-page-grid">
          <div className="t9-page-text t9-reveal">
            <nav className="t9-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t9-h1")}
            {lead}
            <div className="t9-actions">
              {cta()}
              {callBtn()}
            </div>
          </div>
          {photo ? (
            <div className="t9-page-photo t9-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt || ""} loading="eager" />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t9-hero-plain">
        <div className="t9-container t9-plain-inner t9-reveal">
          {title("t9-h2", "h2")}
          {lead}
          <div className="t9-actions">{cta("t9-btn t9-btn-dark")}</div>
        </div>
      </section>
    );
  }

  const photo = photos[0];
  return (
    <>
      <section className="t9-hero t9-hero-home" data-photo={!!photo}>
        <div className="t9-hero-bg">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={photo.alt || ""} loading="eager" />
          ) : (
            <span className="t9-hero-stripes" aria-hidden="true" />
          )}
        </div>
        <div className="t9-container t9-hero-inner">
          <div className="t9-hero-copy t9-reveal">
            <span className="t9-kicker">
              <span className="t9-live" aria-hidden="true" />
              {city ? `${profile.business_name} · ${city}` : profile.business_name}
            </span>
            {title("t9-hero-title")}
            {lead}
            <div className="t9-actions">
              {cta("t9-btn t9-btn-lg")}
              {callBtn()}
            </div>
          </div>
          {hours[0] ? (
            <div className="t9-hero-hours t9-reveal">
              <IconClock size={18} />
              <span>
                <small>Opening hours</small>
                {hours.slice(0, 2).map((h, i) => (
                  <b key={i}>{h}</b>
                ))}
              </span>
            </div>
          ) : null}
        </div>
      </section>
      {classNames.length ? (
        <div className="t9-marquee-wrap">
          <T9Marquee items={classNames} />
        </div>
      ) : null}
    </>
  );
}
