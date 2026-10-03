"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T11Hours from "../components/T11Hours";
import { cityOf, directionsHref, packagesHref, planHref, splitHighlight, useT11 } from "../ctx";
import {
  Barcode,
  Confetti,
  IconArrow,
  IconChat,
  IconClock,
  IconGlass,
  IconMail,
  IconPhone,
  IconPin,
  IconSparkle,
  IconTicket,
  Mesh,
} from "../icons";

type Photo = { url: string; alt: string };

/** The tilted photo "ticket": photo on the left, perforated stub with the host's name on the right. */
function TicketCard({ photo, name, city }: { photo?: Photo; name: string; city: string }) {
  return (
    // The wrapper casts the shadow: the ticket's punched notches are a CSS mask, which would clip it.
    <div className="t11-ticket-wrap">
      <div className="t11-ticket" data-photo={!!photo}>
        <div className="t11-ticket-photo">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt={photo.alt || ""} loading="eager" fetchPriority="high" />
          ) : (
            <span className="t11-ticket-fallback" aria-hidden="true">
              <IconGlass size={64} />
            </span>
          )}
        </div>
        <div className="t11-ticket-stub">
          <span className="t11-ticket-label">Admit all</span>
          <span className="t11-ticket-name">{name}</span>
          {city ? (
            <span className="t11-ticket-meta">
              <IconPin size={13} /> {city}
            </span>
          ) : null}
          <Barcode className="t11-ticket-code" />
        </div>
      </div>
    </div>
  );
}

/** Round "let's celebrate" sticker that slowly spins (decorative). */
function SpinSticker({ className }: { className?: string }) {
  return (
    <span className={`t11-spin ${className ?? ""}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" focusable="false">
        <defs>
          <path id="t11-spin-path" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
        </defs>
        <text>
          <textPath href="#t11-spin-path">LET&apos;S CELEBRATE ✦ LET&apos;S CELEBRATE ✦</textPath>
        </text>
      </svg>
      <span className="t11-spin-core">
        <IconSparkle size={22} />
      </span>
    </span>
  );
}

/**
 * Festive heroes, one per page kind:
 *  - home: centred huge headline over a violet/peach gradient mesh and confetti, "Plan your event",
 *    a tilted photo ticket flanked by polaroids, and package stickers
 *  - about: story beside an arched photo with a spinning "let's celebrate" sticker
 *  - contact: centred headline, RSVP-card contact tiles and an opening-hours card
 *  - extra pages: breadcrumb, headline and a fan of tilted photos
 * Later heroes on a page render as a gradient invitation banner.
 */
export default function T11Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT11();
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, packages } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Plan your event");
  const city = cityOf(profile.address);
  const pkgHref = packagesHref(ctx);

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
        <span className="t11-hl">{word}</span>
      </Tag>
    );
  };
  const lead =
    subtext || enabled ? (
      <EditableText as="p" className="t11-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t11-btn t11-btn-lg") => (
    <a className={cls} href={section.ctaHref || planHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="Plan your event" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );
  const seePackages = pkgHref ? (
    <a className="t11-btn t11-btn-ghost t11-btn-lg" href={pkgHref}>
      <IconTicket size={18} /> See packages
    </a>
  ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t11-hero t11-hero-about">
        <Mesh />
        <Confetti set="band" />
        <div className="t11-container t11-about-grid">
          <div className="t11-about-text t11-reveal">
            <span className="t11-chip">
              <IconSparkle size={13} /> Our story
            </span>
            {title("t11-h1")}
            {lead}
            <div className="t11-actions">
              {cta()}
              <Link className="t11-textlink" href={`${baseUrl}/contact`}>
                Get in touch <IconArrow size={16} />
              </Link>
            </div>
          </div>
          <div className="t11-about-media t11-reveal" data-photo={!!a}>
            <div className="t11-about-arch">
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t11-photo-fallback" aria-hidden="true">
                  <IconGlass size={72} />
                </span>
              )}
            </div>
            <SpinSticker className="t11-about-spin" />
            {city ? (
              <span className="t11-about-tag">
                <IconPin size={15} /> {city}
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
        ? { key: "call", icon: <IconPhone size={22} />, label: "Call us", value: profile.phone, href: buildTelLink(profile.phone), ext: false }
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
      <section className="t11-hero t11-hero-contact">
        <Mesh />
        <Confetti />
        <div className="t11-container">
          <div className="t11-contact-head t11-reveal">
            <span className="t11-chip">
              <IconSparkle size={13} /> RSVP
            </span>
            {title("t11-h1")}
            {lead}
          </div>

          <div className="t11-contact-board" data-hours={hours.length > 0 || enabled} data-tiles={tiles.length > 0}>
            {tiles.length ? (
              <ul className="t11-tiles" data-count={tiles.length}>
                {tiles.map((t) => (
                  <li key={t.key} className="t11-reveal">
                    <a className="t11-tile" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                      <span className="t11-tile-ico">{t.icon}</span>
                      <span className="t11-tile-text">
                        <small>{t.label}</small>
                        <span className="t11-tile-value">{t.value}</span>
                      </span>
                      <span className="t11-tile-go" aria-hidden="true">
                        <IconArrow size={18} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {hours.length || enabled ? (
              <aside className="t11-hours-card t11-reveal" aria-label="Opening hours">
                <h2 className="t11-card-title">
                  <IconClock size={20} /> Opening hours
                </h2>
                <T11Hours />
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const fan = [photos[2], photos[3], photos[4]].filter((p): p is Photo => !!p);
    const shots = fan.length ? fan : photos.slice(0, 3);
    const label = pageLabel || profile.business_name;
    return (
      <section className="t11-hero t11-hero-page" data-photo={shots.length > 0}>
        <Mesh />
        <Confetti set="band" />
        <div className="t11-container t11-page-grid">
          <div className="t11-page-text t11-reveal">
            <nav className="t11-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">✦</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t11-h1")}
            {lead}
            <div className="t11-actions">
              {cta()}
              {seePackages}
            </div>
          </div>
          {shots.length ? (
            <div className="t11-fan t11-reveal" data-count={shots.length}>
              {shots.map((p, i) => (
                <figure key={p.url} className={`t11-fan-shot t11-fan-${i}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt || ""} loading="eager" fetchPriority={i === 0 ? "high" : undefined} />
                </figure>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t11-section t11-hero-plain">
        <div className="t11-container">
          <div className="t11-banner t11-reveal">
            <Confetti set="band" />
            <div className="t11-banner-copy">
              {enabled ? (
                <EditableText as="h2" className="t11-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t11-h2">{headline}</h2>
              )}
              {lead}
            </div>
            <div className="t11-actions">{cta("t11-btn t11-btn-peach t11-btn-lg")}</div>
          </div>
        </div>
      </section>
    );
  }

  const [p0, p1, p2] = photos;
  return (
    <section className="t11-hero t11-hero-home">
      <Mesh />
      <Confetti />
      <div className="t11-container">
        <div className="t11-home-copy t11-reveal">
          <span className="t11-chip">
            <IconSparkle size={13} />
            {city ? `${profile.business_name} · ${city}` : profile.business_name}
          </span>
          {title("t11-hero-title")}
          {lead}
          <div className="t11-actions t11-actions-center">
            {cta()}
            {seePackages}
          </div>
        </div>

        <div className="t11-stage t11-reveal" data-count={photos.length}>
          {p1 ? (
            <figure className="t11-polaroid t11-polaroid-l">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p1.url} alt={p1.alt || ""} loading="eager" />
            </figure>
          ) : null}
          <TicketCard photo={p0} name={profile.business_name} city={city} />
          {p2 ? (
            <figure className="t11-polaroid t11-polaroid-r">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p2.url} alt={p2.alt || ""} loading="eager" />
            </figure>
          ) : null}
        </div>

        {packages.length ? (
          <ul className="t11-stickers t11-reveal" aria-label="What we plan">
            {packages.slice(0, 6).map((p) => (
              <li key={p}>
                <a href={planHref(ctx, { service: p })}>
                  <IconSparkle size={12} /> {p}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
