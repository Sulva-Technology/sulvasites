"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T13Hours from "../components/T13Hours";
import { cityOf, directionsHref, shopHref, useT13 } from "../ctx";
import { IconArrow, IconChat, IconHanger, IconMail, IconPhone, IconPin } from "../icons";

/**
 * Editorial heroes, one per page kind:
 *  - home: full-bleed campaign photo with the headline set large in Italiana
 *  - about: story beside a tall portrait
 *  - contact: centred heading with contact lines and opening hours
 *  - extra pages: centred headline above a wide photo
 * Later heroes on a page render as a black call-to-action band.
 */
export default function T13Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { photos, profile, pageKind, pageLabel, hours, baseUrl, shop } = useT13();
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const fallbackHref = shop ? shopHref(baseUrl) : "";
  const ctaHref = section.ctaHref || fallbackHref;
  const ctaText = section.ctaText || (enabled ? "" : shop ? "Shop the collection" : "");
  const showCta = enabled || (!!ctaText && !!ctaHref);
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") =>
    enabled ? (
      <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
    ) : as === "h1" ? (
      <h1 className={cls}>{headline}</h1>
    ) : (
      <h2 className={cls}>{headline}</h2>
    );
  const lead = (cls = "t13-lead") =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t13-btn t13-btn-lg") =>
    showCta ? (
      <a className={cls} href={ctaHref || undefined}>
        <EditableText as="span" value={ctaText} placeholder="Shop the collection" onCommit={(next) => set({ ctaText: next })} />
        <IconArrow size={18} />
      </a>
    ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t13-hero t13-hero-about">
        <div className="t13-container t13-about-grid">
          <div className="t13-about-text t13-reveal">
            <p className="t13-label">About</p>
            {title("t13-h1")}
            {lead()}
            <div className="t13-actions">
              {cta()}
              <Link className="t13-btn t13-btn-ghost t13-btn-lg" href={`${baseUrl}/contact`}>
                Contact us
              </Link>
            </div>
          </div>
          <div className="t13-about-media t13-reveal" data-photo={!!a}>
            {a ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
            ) : (
              <span className="t13-photo-fallback" aria-hidden="true">
                <IconHanger size={64} />
              </span>
            )}
            {city ? <span className="t13-about-tag">{city}</span> : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const lines = [
      profile.phone ? { key: "call", icon: <IconPhone size={20} />, label: "Call", value: profile.phone, href: buildTelLink(profile.phone), ext: false } : null,
      profile.whatsapp ? { key: "wa", icon: <IconChat size={20} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true } : null,
      profile.email ? { key: "mail", icon: <IconMail size={20} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false } : null,
      profile.address ? { key: "visit", icon: <IconPin size={20} />, label: "Visit", value: profile.address, href: directionsHref(profile.address), ext: true } : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t13-hero t13-hero-contact">
        <div className="t13-container">
          <div className="t13-contact-head t13-reveal">
            <p className="t13-label">Contact</p>
            {title("t13-h1")}
            {lead()}
          </div>
          {lines.length || hours.length || enabled ? (
            <div className="t13-contact-board" data-hours={hours.length > 0 || enabled}>
              {lines.length ? (
                <ul className="t13-contact-lines">
                  {lines.map((t) => (
                    <li key={t.key}>
                      <a href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                        <span className="t13-contact-ico">{t.icon}</span>
                        <span>
                          <small>{t.label}</small>
                          {t.value}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {hours.length || enabled ? (
                <aside className="t13-hours-card" aria-label="Opening hours">
                  <h2 className="t13-card-title">Opening hours</h2>
                  <T13Hours />
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const shot = photos[2] ?? photos[0];
    const label = pageLabel || profile.business_name;
    return (
      <section className="t13-hero t13-hero-page">
        <div className="t13-container">
          <div className="t13-page-head t13-reveal">
            <nav className="t13-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t13-h1")}
            {lead()}
            {showCta ? <div className="t13-actions t13-actions-center">{cta()}</div> : null}
          </div>
          {shot ? (
            <figure className="t13-page-photo t13-reveal">
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
      <section className="t13-section t13-hero-plain">
        <div className="t13-container">
          <div className="t13-banner t13-reveal">
            <div className="t13-banner-copy">
              {enabled ? (
                <EditableText as="h2" className="t13-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t13-h2">{headline}</h2>
              )}
              {lead("t13-banner-lead")}
            </div>
            {showCta ? <div className="t13-actions">{cta("t13-btn t13-btn-light t13-btn-lg")}</div> : null}
          </div>
        </div>
      </section>
    );
  }

  const p0 = photos[0];
  return (
    <section className="t13-hero t13-hero-home" data-photo={!!p0}>
      <div className="t13-hero-bg">
        {p0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p0.url} alt={p0.alt || ""} loading="eager" fetchPriority="high" />
        ) : null}
      </div>
      <div className="t13-container t13-home-grid">
        <div className="t13-home-copy t13-reveal">
          <p className="t13-label t13-hero-kicker">{city ? `${profile.business_name} · ${city}` : profile.business_name}</p>
          {title("t13-hero-title")}
          {lead()}
          {showCta ? <div className="t13-actions">{cta("t13-btn t13-btn-light t13-btn-lg")}</div> : null}
        </div>
      </div>
    </section>
  );
}
