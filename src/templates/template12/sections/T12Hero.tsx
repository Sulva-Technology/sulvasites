"use client";

import Link from "next/link";
import { type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T12Hours from "../components/T12Hours";
import T12Licence from "../components/T12Licence";
import { cityOf, directionsHref, quoteHref, quoteQuery, servicesHref, useT12 } from "../ctx";
import {
  Hazard,
  IconArrow,
  IconBadge,
  IconChat,
  IconClock,
  IconHelmet,
  IconMail,
  IconPhone,
  IconPin,
} from "../icons";

type Photo = { url: string; alt: string };

/**
 * The home hero's quote request: name, phone and service. Submitting goes to the contact page
 * with `?service=…&name=…&phone=…`, where the full quote form arrives prefilled.
 * Does nothing while inline editing.
 */
function QuoteMiniForm({ editing }: { editing: boolean }) {
  const { baseUrl, services } = useT12();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editing) return;
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "");
    window.location.assign(
      `${baseUrl}/contact${quoteQuery({ service: get("service"), name: get("name"), phone: get("phone") })}#quote`,
    );
  };

  return (
    <form className="t12-qcard t12-reveal" onSubmit={onSubmit} aria-label="Request a quote">
      <Hazard className="t12-qcard-stripe" />
      <div className="t12-qcard-head">
        <p className="t12-label">Quote request</p>
        <h2 className="t12-qcard-title">Tell us about the job</h2>
      </div>
      <label className="t12-field">
        <span>Your name</span>
        <input className="t12-input" name="name" autoComplete="name" />
      </label>
      <label className="t12-field">
        <span>Phone</span>
        <input className="t12-input" name="phone" type="tel" autoComplete="tel" />
      </label>
      {services.length ? (
        <label className="t12-field">
          <span>Service</span>
          <select className="t12-input" name="service" defaultValue="">
            <option value="" disabled>
              Choose a service
            </option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button type="submit" className="t12-btn t12-btn-block t12-btn-lg">
        Continue to quote <IconArrow size={18} />
      </button>
      <p className="t12-qcard-note">Next: add the job details on our contact page.</p>
    </form>
  );
}

/** Credential badges from the site's backed_by sections (licences, certifications, memberships). */
function Credentials({ items }: { items: string[] }) {
  return (
    <ul className="t12-creds" aria-label="Credentials">
      {items.map((c) => (
        <li key={c}>
          <IconBadge size={18} />
          <span>{c}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Hard-working heroes, one per page kind:
 *  - home: full-bleed site photo under a dark overlay, big condensed headline, licence chip,
 *    a quote-request mini-form and a credential badge strip on a hazard-striped base
 *  - about: story beside a photo framed by an offset orange block and hazard corner
 *  - contact: charcoal band with square contact tiles and a working-hours card
 *  - extra pages: blueprint-grid header with breadcrumb, headline and a striped photo frame
 * Later heroes on a page render as an orange call-to-action banner.
 */
export default function T12Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT12();
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, credentials, pageHasCredentials } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Request a quote");
  const city = cityOf(profile.address);
  const svcHref = servicesHref(ctx);

  const title = (cls: string, as: "h1" | "h2" = "h1") =>
    enabled ? (
      <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
    ) : as === "h1" ? (
      <h1 className={cls}>{headline}</h1>
    ) : (
      <h2 className={cls}>{headline}</h2>
    );
  const lead = (cls = "t12-lead") =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t12-btn t12-btn-lg") => (
    <a className={cls} href={section.ctaHref || quoteHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="Request a quote" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t12-hero t12-hero-about">
        <div className="t12-container t12-about-grid">
          <div className="t12-about-text t12-reveal">
            <p className="t12-label t12-kicker">
              <span className="t12-kicker-sq" aria-hidden="true" /> About us
            </p>
            {title("t12-h1")}
            {lead()}
            <T12Licence />
            <div className="t12-actions">
              {cta()}
              <Link className="t12-btn t12-btn-outline t12-btn-lg" href={`${baseUrl}/contact`}>
                Contact us
              </Link>
            </div>
          </div>
          <div className="t12-about-media t12-reveal" data-photo={!!a}>
            <span className="t12-about-block" aria-hidden="true" />
            <div className="t12-about-photo">
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t12-photo-fallback" aria-hidden="true">
                  <IconHelmet size={72} />
                </span>
              )}
            </div>
            <Hazard className="t12-about-corner" />
            {city ? (
              <span className="t12-about-tag">
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
        ? { key: "call", icon: <IconPhone size={22} />, label: "Call", value: profile.phone, href: buildTelLink(profile.phone), ext: false }
        : null,
      profile.whatsapp
        ? { key: "wa", icon: <IconChat size={22} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true }
        : null,
      profile.email
        ? { key: "mail", icon: <IconMail size={22} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false }
        : null,
      profile.address
        ? { key: "visit", icon: <IconPin size={22} />, label: "Yard / office", value: profile.address, href: directionsHref(profile.address), ext: true }
        : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t12-hero t12-hero-contact t12-dark">
        <Hazard className="t12-band-stripe" />
        <div className="t12-container">
          <div className="t12-contact-head t12-reveal">
            <p className="t12-label t12-kicker">
              <span className="t12-kicker-sq" aria-hidden="true" /> Contact
            </p>
            {title("t12-h1")}
            {lead()}
          </div>

          <div className="t12-contact-board" data-hours={hours.length > 0 || enabled} data-tiles={tiles.length > 0}>
            {tiles.length ? (
              <ul className="t12-tiles" data-count={tiles.length}>
                {tiles.map((t) => (
                  <li key={t.key} className="t12-reveal">
                    <a className="t12-tile" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                      <span className="t12-tile-ico">{t.icon}</span>
                      <span className="t12-tile-text">
                        <small>{t.label}</small>
                        <span className="t12-tile-value">{t.value}</span>
                      </span>
                      <span className="t12-tile-go" aria-hidden="true">
                        <IconArrow size={18} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {hours.length || enabled ? (
              <aside className="t12-hours-card t12-reveal" aria-label="Working hours">
                <h2 className="t12-card-title">
                  <IconClock size={20} /> Working hours
                </h2>
                <T12Hours />
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const shot = photos[2] ?? photos[0];
    const label = pageLabel || profile.business_name;
    return (
      <section className="t12-hero t12-hero-page" data-photo={!!shot}>
        <div className="t12-container t12-page-grid">
          <div className="t12-page-text t12-reveal">
            <nav className="t12-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t12-h1")}
            {lead()}
            <div className="t12-actions">
              {cta()}
              {svcHref && svcHref !== "#services" ? (
                <a className="t12-btn t12-btn-outline t12-btn-lg" href={svcHref}>
                  Our services
                </a>
              ) : null}
            </div>
          </div>
          {shot ? (
            <figure className="t12-page-photo t12-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt={shot.alt || ""} loading="eager" fetchPriority="high" />
              <Hazard className="t12-page-photo-stripe" />
            </figure>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t12-section t12-hero-plain">
        <div className="t12-container">
          <div className="t12-banner t12-reveal">
            <div className="t12-banner-copy">
              {enabled ? (
                <EditableText as="h2" className="t12-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t12-h2">{headline}</h2>
              )}
              {lead("t12-banner-lead")}
            </div>
            <div className="t12-actions">{cta("t12-btn t12-btn-ink t12-btn-lg")}</div>
          </div>
        </div>
      </section>
    );
  }

  const p0: Photo | undefined = photos[0];
  const showCreds = !pageHasCredentials && credentials.length > 0;
  return (
    <section className="t12-hero t12-hero-home" data-photo={!!p0}>
      <div className="t12-hero-bg">
        {p0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p0.url} alt={p0.alt || ""} loading="eager" fetchPriority="high" />
        ) : null}
      </div>
      <div className="t12-container t12-home-grid">
        <div className="t12-home-copy t12-reveal">
          <p className="t12-label t12-kicker">
            <span className="t12-kicker-sq" aria-hidden="true" />
            {city ? `${profile.business_name} · ${city}` : profile.business_name}
          </p>
          {title("t12-hero-title")}
          {lead()}
          <T12Licence className="t12-licence-hero" />
          <div className="t12-actions">
            {cta()}
            {profile.phone ? (
              <a className="t12-btn t12-btn-outline-light t12-btn-lg" href={buildTelLink(profile.phone)}>
                <IconPhone size={17} /> {profile.phone}
              </a>
            ) : svcHref ? (
              <a className="t12-btn t12-btn-outline-light t12-btn-lg" href={svcHref}>
                Our services
              </a>
            ) : null}
          </div>
        </div>
        <QuoteMiniForm editing={enabled} />
      </div>
      {showCreds ? (
        <div className="t12-hero-base">
          <div className="t12-container">
            <Credentials items={credentials} />
          </div>
        </div>
      ) : null}
      <Hazard className="t12-hero-stripe" />
    </section>
  );
}
