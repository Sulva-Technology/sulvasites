"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { cityOf, directionsHref, hoursOf, joinHref, splitHeadline, useT16 } from "../ctx";
import { IconArrow, IconArrowUpRight, IconChat, IconCircles, IconClock, IconMail, IconPhone, IconPin } from "../icons";

/** Headline with its accent phrase in serif italic (plain text while editing). */
export function T16Title({
  text,
  className,
  as = "h1",
  enabled,
  placeholder = "Hero headline",
  onCommit,
}: {
  text: string;
  className: string;
  as?: "h1" | "h2";
  enabled?: boolean;
  placeholder?: string;
  onCommit?: (next: string) => void;
}) {
  if (enabled) {
    return <EditableText as={as} className={className} value={text} placeholder={placeholder} multiline onCommit={(next) => onCommit?.(next)} />;
  }
  const lines = splitHeadline(text);
  const body = lines.map(([plain, accent], i) => (
    <span key={i} className="t16-title-line">
      {plain}
      {accent ? <em className="t16-accent-word">{accent}</em> : null}
    </span>
  ));
  return as === "h1" ? <h1 className={className}>{body}</h1> : <h2 className={className}>{body}</h2>;
}

/**
 * Heroes, one per page kind:
 *  - home: pill eyebrow, giant headline with a serif-italic phrase, CTA pill + text link,
 *    stat pills, and a tall rounded photo inside an offset outline frame
 *  - about: "Our story" badge, headline and lead beside a square photo with a glass vision card
 *  - contact: centred heading over soft glows, then contact cards and meeting times
 *  - extra pages: centred breadcrumb pill, headline and a wide rounded photo
 * Later heroes on a page render as a deep-blue call-to-action panel.
 */
export default function T16Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT16();
  const { photos, profile, pageKind, pageLabel, baseUrl, pageHasCircles, heroStats } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  // Visitors get sensible fallbacks; the editor shows the real (possibly empty) fields with hints.
  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");
  const ctaText = section.ctaText || (enabled ? "" : "Become a member");
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") => (
    <T16Title text={headline} className={cls} as={as} enabled={enabled} onCommit={(next) => set({ headline: next })} />
  );
  const lead = (cls = "t16-lead") =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t16-btn t16-btn-solid t16-btn-lg") => (
    <a className={cls} href={section.ctaHref || joinHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="Become a member" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={18} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    const vision = profile.description || profile.tagline || "";
    return (
      <section className="t16-hero t16-hero-about">
        <span className="t16-skew" aria-hidden="true" />
        <div className="t16-container t16-about-grid">
          <div className="t16-about-text t16-reveal">
            <span className="t16-badge">
              <span className="t16-pulse" aria-hidden="true" /> Our story
            </span>
            {title("t16-h1")}
            {lead()}
            <div className="t16-actions">
              {cta()}
              <Link className="t16-textbtn" href={`${baseUrl}/contact`}>
                Get in touch <IconArrow size={16} />
              </Link>
            </div>
          </div>
          <div className="t16-about-media t16-reveal">
            <div className="t16-about-photo" data-photo={!!a}>
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.alt || ""} loading="eager" fetchPriority="high" />
              ) : (
                <span className="t16-photo-fallback" aria-hidden="true">
                  <IconCircles size={72} />
                </span>
              )}
            </div>
            {vision ? (
              <div className="t16-vision t16-glass">
                <span className="t16-vision-bar" aria-hidden="true" />
                <p className="t16-kicker">What we stand for</p>
                <p className="t16-vision-quote">&ldquo;{vision}&rdquo;</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
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
        ? { key: "visit", icon: <IconPin size={20} />, label: "Visit", value: profile.address, href: directionsHref(profile.address), ext: true }
        : null,
    ].filter((t): t is NonNullable<typeof t> => !!t);

    return (
      <section className="t16-hero t16-hero-contact">
        <span className="t16-glows" aria-hidden="true" />
        <div className="t16-container">
          <div className="t16-center-head t16-reveal">
            <p className="t16-kicker">Contact us</p>
            {title("t16-h1")}
            {lead("t16-lead t16-lead-center")}
          </div>
          {tiles.length || hours.length ? (
            <div className="t16-tiles" data-count={tiles.length + (hours.length ? 1 : 0)}>
              {tiles.map((t) => (
                <a key={t.key} className="t16-tile t16-reveal" href={t.href} {...(t.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                  <span className="t16-ico-tile">{t.icon}</span>
                  <small>{t.label}</small>
                  <span className="t16-tile-value">{t.value}</span>
                  <span className="t16-tile-go" aria-hidden="true">
                    <IconArrowUpRight size={16} />
                  </span>
                </a>
              ))}
              {hours.length ? (
                <div className="t16-tile t16-reveal">
                  <span className="t16-ico-tile">
                    <IconClock size={20} />
                  </span>
                  <small>When we meet</small>
                  <ul className="t16-tile-hours">
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
      <section className="t16-hero t16-hero-page">
        <span className="t16-glows" aria-hidden="true" />
        <div className="t16-container">
          <div className="t16-center-head t16-reveal">
            <nav className="t16-crumbs" aria-label="Breadcrumb">
              <Link href={`${baseUrl}/`}>Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{label}</span>
            </nav>
            {title("t16-h1")}
            {lead("t16-lead t16-lead-center")}
            <div className="t16-actions t16-actions-center">{cta()}</div>
          </div>
          {shot ? (
            <figure className="t16-page-photo t16-reveal">
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
      <section className="t16-section t16-hero-plain">
        <div className="t16-container t16-container-narrow">
          <div className="t16-cta t16-reveal">
            <span className="t16-cta-glow" aria-hidden="true" />
            {title("t16-h2", "h2")}
            {lead("t16-cta-lead")}
            <div className="t16-actions t16-actions-center">{cta("t16-btn t16-btn-white t16-btn-lg")}</div>
          </div>
        </div>
      </section>
    );
  }

  const cover = photos[0];
  const eyebrow = city ? `${profile.business_name} · ${city}` : profile.business_name;
  return (
    <section className="t16-hero t16-hero-home">
      <span className="t16-glows" aria-hidden="true" />
      <div className="t16-container t16-home-grid" data-photo={!!cover}>
        <div className="t16-home-copy">
          <p className="t16-pill-eyebrow t16-rise">{eyebrow}</p>
          <div className="t16-rise t16-rise-2">{title("t16-hero-title")}</div>
          <div className="t16-rise t16-rise-3">{lead()}</div>
          <div className="t16-actions t16-rise t16-rise-4">
            {cta()}
            {pageHasCircles && section.ctaHref !== "#communities" ? (
              <a className="t16-textbtn" href="#communities">
                Explore communities
              </a>
            ) : (
              <Link className="t16-textbtn" href={`${baseUrl}/about`}>
                Our story
              </Link>
            )}
          </div>
          {heroStats.length ? (
            <ul className="t16-stat-pills t16-rise t16-rise-5">
              {heroStats.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {cover ? (
          <div className="t16-home-media t16-rise t16-rise-2">
            <div className="t16-home-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.url} alt={cover.alt || ""} loading="eager" fetchPriority="high" />
            </div>
            <span className="t16-home-frame" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
