"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { chipTone, cityOf, directionsHref, enquireHref, hoursOf, specChips, useT15 } from "../ctx";
import { IconArrow, IconArrowUpRight, IconChat, IconClock, IconMail, IconPhone, IconPin, IconWheel } from "../icons";

/** Short spec chips ("1987", "V8", "Available") — sold / under-offer chips get their own tone. */
export function T15Chips({ chips, className }: { chips: string[]; className?: string }) {
  if (!chips.length) return null;
  return (
    <ul className={`t15-chips ${className ?? ""}`}>
      {chips.map((c) => (
        <li key={c} data-tone={chipTone(c)}>
          {c}
        </li>
      ))}
    </ul>
  );
}

/**
 * Cinematic heroes, one per page kind:
 *  - home: full-bleed gallery video (or photo) under dark gradients, eyebrow, big headline,
 *    glass buttons and a floating glass "Featured" card for the first car in the collection
 *  - about: story beside a tall rounded photo with a glass location chip
 *  - contact: glass contact tiles and showroom hours over a blurred photo
 *  - extra pages: breadcrumb, headline and a wide rounded photo banner
 * Later heroes on a page render as a glass call-to-action banner.
 */
export default function T15Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT15();
  const { photos, video, featured, profile, pageKind, pageLabel, baseUrl, pageHasCollection } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Make an enquiry");
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") =>
    enabled ? (
      <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
    ) : as === "h1" ? (
      <h1 className={cls}>{headline}</h1>
    ) : (
      <h2 className={cls}>{headline}</h2>
    );
  const lead = (cls = "t15-lead") =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t15-btn t15-btn-solid t15-btn-lg") => (
    <a className={cls} href={section.ctaHref || enquireHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="Make an enquiry" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t15-hero t15-hero-about">
        <div className="t15-container t15-about-grid">
          <div className="t15-about-text t15-reveal">
            <p className="t15-eyebrow">About {profile.business_name}</p>
            {title("t15-h1")}
            {lead()}
            <div className="t15-actions">
              {cta()}
              <Link className="t15-btn t15-btn-glass t15-btn-lg" href={`${baseUrl}/contact`}>
                Visit us
              </Link>
            </div>
          </div>
          <div className="t15-about-media t15-reveal" data-photo={!!a}>
            {a ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
            ) : (
              <span className="t15-photo-fallback" aria-hidden="true">
                <IconWheel size={72} />
              </span>
            )}
            {city ? (
              <span className="t15-about-tag t15-glass t15-glass-dark">
                <IconPin size={15} /> {city}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const bg = photos[2] ?? photos[0];
    const hours = hoursOf(profile);
    const tiles = [
      profile.phone
        ? { key: "call", icon: <IconPhone size={20} />, label: "Call", value: profile.phone, href: buildTelLink(profile.phone), ext: false }
        : null,
      profile.whatsapp
        ? { key: "wa", icon: <IconChat size={20} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true }
        : null,
      profile.email
        ? { key: "mail", icon: <IconMail size={20} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false }
        : null,
      profile.address
        ? { key: "visit", icon: <IconPin size={20} />, label: "Showroom", value: profile.address, href: directionsHref(profile.address), ext: true }
        : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t15-hero t15-hero-contact t15-on-dark" data-photo={!!bg}>
        <div className="t15-hero-bg" aria-hidden="true">
          {bg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bg.url} alt="" loading="eager" />
          ) : null}
        </div>
        <div className="t15-container">
          <div className="t15-contact-head t15-reveal">
            <p className="t15-eyebrow">Contact</p>
            {title("t15-h1")}
            {lead()}
          </div>
          {tiles.length || hours.length ? (
            <div className="t15-contact-board">
              {tiles.map((t) => (
                <a
                  key={t.key}
                  className="t15-tile t15-glass t15-glass-dark t15-reveal"
                  href={t.href}
                  {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <span className="t15-tile-ico">{t.icon}</span>
                  <small>{t.label}</small>
                  <span className="t15-tile-value">{t.value}</span>
                  <span className="t15-tile-go" aria-hidden="true">
                    <IconArrowUpRight size={18} />
                  </span>
                </a>
              ))}
              {hours.length ? (
                <div className="t15-tile t15-tile-hours t15-glass t15-glass-dark t15-reveal">
                  <span className="t15-tile-ico">
                    <IconClock size={20} />
                  </span>
                  <small>Showroom hours</small>
                  <ul>
                    {hours.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const shot = photos[3] ?? photos[0];
    const label = pageLabel || profile.business_name;
    return (
      <section className="t15-hero t15-hero-page">
        <div className="t15-container">
          <div className="t15-page-head t15-reveal">
            <nav className="t15-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t15-h1")}
            {lead()}
            <div className="t15-actions">{cta()}</div>
          </div>
          {shot ? (
            <figure className="t15-page-photo t15-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt={shot.alt || ""} loading="eager" fetchPriority="high" />
            </figure>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t15-section t15-hero-plain">
        <div className="t15-container">
          <div className="t15-banner t15-glass t15-reveal">
            <div>
              {enabled ? (
                <EditableText as="h2" className="t15-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t15-h2">{headline}</h2>
              )}
              {lead("t15-banner-lead")}
            </div>
            <div className="t15-actions">{cta()}</div>
          </div>
        </div>
      </section>
    );
  }

  const p0 = photos[0];
  const cover = photos[1] ?? photos[0];
  const spec = specChips(featured?.description);
  const eyebrow = city ? `${profile.business_name} · ${city}` : profile.business_name;
  return (
    <section className="t15-hero t15-hero-home t15-on-dark" data-media={!!(video || p0)}>
      <div className="t15-hero-bg" aria-hidden="true">
        {video ? (
          <video src={video.url} poster={p0?.url} autoPlay loop muted playsInline preload="metadata" />
        ) : p0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p0.url} alt="" loading="eager" fetchPriority="high" />
        ) : null}
        <span className="t15-hero-shade" />
      </div>
      <div className="t15-container t15-home-grid">
        <div className="t15-home-copy t15-reveal">
          <p className="t15-eyebrow">{eyebrow}</p>
          {title("t15-hero-title")}
          {lead()}
          <div className="t15-actions">
            {cta("t15-btn t15-btn-glass t15-btn-glass-strong t15-btn-lg")}
            {pageHasCollection && section.ctaHref !== "#collection" ? (
              <a className="t15-btn t15-btn-outline t15-btn-lg" href="#collection">
                View the collection
              </a>
            ) : profile.phone ? (
              <a className="t15-btn t15-btn-outline t15-btn-lg" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} /> {profile.phone}
              </a>
            ) : null}
          </div>
        </div>

        {featured ? (
          <a className="t15-featured t15-glass t15-glass-dark t15-reveal" href={enquireHref(ctx, featured.title)}>
            <span className="t15-featured-top">
              <span className="t15-featured-label">Featured</span>
              <span className="t15-featured-go" aria-hidden="true">
                <IconArrowUpRight size={16} />
              </span>
            </span>
            {cover ? (
              <span className="t15-featured-photo">
                {/* The card's title names it; the borrowed cover is decorative. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.url} alt="" loading="eager" />
              </span>
            ) : null}
            <span className="t15-featured-title">{featured.title}</span>
            <T15Chips chips={spec.chips} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
