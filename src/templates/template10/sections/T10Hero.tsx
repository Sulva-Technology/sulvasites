"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T10Hours from "../components/T10Hours";
import { applyHref, cityOf, directionsHref, splitHighlight, useT10 } from "../ctx";
import {
  IconArrow,
  IconCalendar,
  IconCap,
  IconChat,
  IconCheck,
  IconClock,
  IconMail,
  IconPhone,
  IconPin,
  IconSpark,
  Scribble,
} from "../icons";

type Photo = { url: string; alt: string };

/** Up to three gallery photos as a playful collage; degrades to one or two photos, or an illustrated card. */
function Collage({ photos, name }: { photos: Photo[]; name: string }) {
  const shots = photos.slice(0, 3);
  return (
    <div className="t10-collage t10-reveal" data-count={shots.length}>
      <span className="t10-collage-sun" aria-hidden="true" />
      <span className="t10-collage-dots" aria-hidden="true" />
      {shots.length ? (
        shots.map((p, i) => (
          <figure key={p.url} className={`t10-collage-shot t10-collage-${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.alt || ""} loading={i === 0 ? "eager" : "lazy"} />
          </figure>
        ))
      ) : (
        <div className="t10-collage-fallback" aria-hidden="true">
          <span className="t10-collage-cap">
            <IconCap size={64} />
          </span>
          <span className="t10-collage-name">{name}</span>
        </div>
      )}
      <span className="t10-collage-sticker" aria-hidden="true">
        <IconSpark size={22} />
      </span>
    </div>
  );
}

/**
 * Education heroes, one per page kind:
 *  - home: headline with a scribble-underlined word, "Apply now" / "Book a visit", photo collage,
 *    and a labelled highlights row taken from the site's values
 *  - about: story beside an arched photo on a sunflower disc
 *  - contact: centred headline, rounded contact tiles and an office-hours card
 *  - extra pages: breadcrumb, page chip and a rounded photo on a dotted panel
 * Later heroes on a page render as a blue rounded call-to-action banner.
 */
export default function T10Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT10();
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, highlights } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Apply now");
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") => {
    if (enabled) {
      return (
        <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
      );
    }
    const Tag = as;
    const [before, word] = splitHighlight(headline);
    return (
      <Tag className={cls}>
        {before}
        <span className="t10-hl">
          {word}
          <Scribble className="t10-scribble" />
        </span>
      </Tag>
    );
  };
  const lead =
    subtext || enabled ? (
      <EditableText as="p" className="t10-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t10-btn t10-btn-lg") => (
    <a className={cls} href={section.ctaHref || applyHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="Apply now" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );
  const visit = (cls = "t10-btn t10-btn-outline t10-btn-lg") => (
    <a className={cls} href={applyHref(ctx, { intent: "visit" })}>
      <IconCalendar size={17} /> Book a visit
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t10-hero t10-hero-about">
        <div className="t10-container t10-about-grid">
          <div className="t10-about-text t10-reveal">
            <span className="t10-chip t10-chip-sun">About {profile.business_name}</span>
            {title("t10-h1")}
            {lead}
            <div className="t10-actions">
              {cta()}
              <Link className="t10-textlink" href={`${baseUrl}/contact`}>
                Visit us <IconArrow size={16} />
              </Link>
            </div>
          </div>
          <div className="t10-about-media t10-reveal" data-photo={!!a}>
            <span className="t10-about-disc" aria-hidden="true" />
            <div className="t10-about-arch">
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.alt || ""} loading="eager" />
              ) : (
                <span className="t10-photo-fallback" aria-hidden="true">
                  <IconCap size={72} />
                </span>
              )}
            </div>
            {city ? (
              <span className="t10-about-tag">
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
        ? { key: "call", icon: <IconPhone size={22} />, label: "Call the office", value: profile.phone, href: buildTelLink(profile.phone), ext: false }
        : null,
      profile.whatsapp
        ? { key: "wa", icon: <IconChat size={22} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true }
        : null,
      profile.email
        ? { key: "mail", icon: <IconMail size={22} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false }
        : null,
      profile.address
        ? { key: "visit", icon: <IconPin size={22} />, label: "Find us", value: profile.address, href: directionsHref(profile.address), ext: true }
        : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t10-hero t10-hero-contact">
        <div className="t10-container">
          <div className="t10-contact-head t10-reveal">
            <span className="t10-chip">Contact &amp; admissions</span>
            {title("t10-h1")}
            {lead}
          </div>

          <div className="t10-contact-board" data-hours={hours.length > 0 || enabled} data-tiles={tiles.length > 0}>
            {tiles.length ? (
              <ul className="t10-tiles" data-count={tiles.length}>
                {tiles.map((t) => (
                  <li key={t.key} className="t10-reveal">
                    <a className="t10-tile" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                      <span className="t10-tile-ico">{t.icon}</span>
                      <span className="t10-tile-text">
                        <small>{t.label}</small>
                        <span className="t10-tile-value">{t.value}</span>
                      </span>
                      <span className="t10-tile-go" aria-hidden="true">
                        <IconArrow size={18} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {hours.length || enabled ? (
              <aside className="t10-hours-card t10-reveal" aria-label="Office hours">
                <h2 className="t10-card-title">
                  <IconClock size={20} /> Office hours
                </h2>
                <T10Hours />
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
      <section className="t10-hero t10-hero-page" data-photo={!!photo}>
        <div className="t10-container t10-page-grid">
          <div className="t10-page-text t10-reveal">
            <nav className="t10-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t10-h1")}
            {lead}
            <div className="t10-actions">
              {cta()}
              {visit()}
            </div>
          </div>
          {photo ? (
            <div className="t10-page-photo t10-reveal">
              <span className="t10-page-ring" aria-hidden="true" />
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
      <section className="t10-section t10-hero-plain">
        <div className="t10-container">
          <div className="t10-banner t10-reveal">
            <span className="t10-banner-ring" aria-hidden="true" />
            <div className="t10-banner-copy">
              {enabled ? (
                <EditableText as="h2" className="t10-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t10-h2">{headline}</h2>
              )}
              {lead}
            </div>
            <div className="t10-actions">{cta("t10-btn t10-btn-sun t10-btn-lg")}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="t10-hero t10-hero-home">
      <div className="t10-container">
        <div className="t10-home-grid">
          <div className="t10-home-copy t10-reveal">
            <span className="t10-chip">
              <IconCap size={16} />
              {city ? `${profile.business_name} · ${city}` : profile.business_name}
            </span>
            {title("t10-hero-title")}
            {lead}
            <div className="t10-actions">
              {cta()}
              {visit()}
            </div>
            {profile.phone ? (
              <p className="t10-hero-call">
                Prefer to talk? <a href={buildTelLink(profile.phone)}>{profile.phone}</a>
              </p>
            ) : null}
          </div>
          <Collage photos={photos} name={profile.business_name} />
        </div>

        {highlights.length ? (
          <ul className="t10-highlights t10-reveal" data-count={highlights.length} aria-label="Highlights">
            {highlights.map((h) => (
              <li key={h}>
                <span className="t10-highlight-ico" aria-hidden="true">
                  <IconCheck size={16} />
                </span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
