"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T14Hours from "../components/T14Hours";
import { cityOf, directionsHref, shopHref, useT14 } from "../ctx";
import { IconArrow, IconChat, IconStore, IconMail, IconPhone, IconPin } from "../icons";

/**
 * Heroes, one per page kind:
 *  - home: headline and call to action beside a photo panel
 *  - about: story beside a tall portrait
 *  - contact: centred heading with contact lines and opening hours
 *  - extra pages: centred headline above a wide photo
 * Later heroes on a page render as a black call-to-action band.
 */
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
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") =>
    enabled ? (
      <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
    ) : as === "h1" ? (
      <h1 className={cls}>{headline}</h1>
    ) : (
      <h2 className={cls}>{headline}</h2>
    );
  const lead = (cls = "t14-lead") =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t14-btn t14-btn-lg") =>
    showCta ? (
      <a className={cls} href={ctaHref || undefined}>
        <EditableText as="span" value={ctaText} placeholder="Shop now" onCommit={(next) => set({ ctaText: next })} />
        <IconArrow size={18} />
      </a>
    ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    return (
      <section className="t14-hero t14-hero-about">
        <div className="t14-container t14-about-grid">
          <div className="t14-about-text t14-reveal">
            <p className="t14-label">About</p>
            {title("t14-h1")}
            {lead()}
            <div className="t14-actions">
              {cta()}
              <Link className="t14-btn t14-btn-ghost t14-btn-lg" href={`${baseUrl}/contact`}>
                Contact us
              </Link>
            </div>
          </div>
          <div className="t14-about-media t14-reveal" data-photo={!!a}>
            {a ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
            ) : (
              <span className="t14-photo-fallback" aria-hidden="true">
                <IconStore size={64} />
              </span>
            )}
            {city ? <span className="t14-about-tag">{city}</span> : null}
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
      <section className="t14-hero t14-hero-contact">
        <div className="t14-container">
          <div className="t14-contact-head t14-reveal">
            <p className="t14-label">Contact</p>
            {title("t14-h1")}
            {lead()}
          </div>
          {lines.length || hours.length || enabled ? (
            <div className="t14-contact-board" data-hours={hours.length > 0 || enabled}>
              {lines.length ? (
                <ul className="t14-contact-lines">
                  {lines.map((t) => (
                    <li key={t.key}>
                      <a href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                        <span className="t14-contact-ico">{t.icon}</span>
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
                <aside className="t14-hours-card" aria-label="Opening hours">
                  <h2 className="t14-card-title">Opening hours</h2>
                  <T14Hours />
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
      <section className="t14-hero t14-hero-page">
        <div className="t14-container">
          <div className="t14-page-head t14-reveal">
            <nav className="t14-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t14-h1")}
            {lead()}
            {showCta ? <div className="t14-actions t14-actions-center">{cta()}</div> : null}
          </div>
          {shot ? (
            <figure className="t14-page-photo t14-reveal">
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
      <section className="t14-section t14-hero-plain">
        <div className="t14-container">
          <div className="t14-banner t14-reveal">
            <div className="t14-banner-copy">
              {enabled ? (
                <EditableText as="h2" className="t14-h2" value={headline} placeholder="Banner headline" multiline onCommit={(next) => set({ headline: next })} />
              ) : (
                <h2 className="t14-h2">{headline}</h2>
              )}
              {lead("t14-banner-lead")}
            </div>
            {showCta ? <div className="t14-actions">{cta("t14-btn t14-btn-light t14-btn-lg")}</div> : null}
          </div>
        </div>
      </section>
    );
  }

  const p0 = photos[0];
  const p1 = photos[3] ?? photos[1];
  return (
    <section className="t14-hero t14-hero-home" data-photo={!!p0}>
      <div className="t14-container t14-home-grid">
        <div className="t14-home-copy t14-reveal">
          <p className="t14-label t14-hero-kicker">{city ? `${profile.business_name} · ${city}` : profile.business_name}</p>
          {title("t14-hero-title")}
          {lead()}
          {showCta ? <div className="t14-actions">{cta("t14-btn t14-btn-lg")}</div> : null}
        </div>
        <div className="t14-home-media t14-reveal" aria-hidden={p0 ? undefined : true}>
          {p0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t14-home-img" src={p0.url} alt={p0.alt || ""} loading="eager" fetchPriority="high" />
          ) : (
            <span className="t14-photo-fallback">
              <IconStore size={72} />
            </span>
          )}
          {p0 && p1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t14-home-img2" src={p1.url} alt="" loading="eager" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
