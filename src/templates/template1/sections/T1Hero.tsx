"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink } from "@/templates/shared/links";
import { useT1 } from "../ctx";
import { IconArrow, IconCheck } from "../icons";

/** Decorative diagonal ribbons, coloured from the theme accent. */
function Ribbons() {
  const bands = [
    { x: 40, w: 150, h: 360, c: "a" },
    { x: 210, w: 170, h: 520, c: "b" },
    { x: 400, w: 160, h: 430, c: "c" },
    { x: 580, w: 190, h: 620, c: "a" },
  ];
  return (
    <svg
      className="t1-ribbons"
      viewBox="0 0 800 640"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="t1g-a" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--t1-lime)" }} />
          <stop offset="1" style={{ stopColor: "var(--t1-accent)" }} />
        </linearGradient>
        <linearGradient id="t1g-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--t1-accent)" }} />
          <stop offset="1" style={{ stopColor: "var(--t1-sky)" }} />
        </linearGradient>
        <linearGradient id="t1g-c" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--t1-sky)" }} />
          <stop offset="1" style={{ stopColor: "var(--t1-accent)" }} />
        </linearGradient>
      </defs>
      {bands.map((b, i) => (
        <g
          key={i}
          className="t1-ribbon"
          style={{ animationDelay: `${i * -1.6}s` }}
        >
          {/* front face */}
          <polygon
            points={`${b.x},640 ${b.x + b.w},640 ${b.x + b.w + 120},${640 - b.h} ${b.x + 120},${640 - b.h}`}
            fill={`url(#t1g-${b.c})`}
          />
          {/* side face for depth */}
          <polygon
            points={`${b.x + b.w},640 ${b.x + b.w + 34},640 ${b.x + b.w + 154},${640 - b.h + 26} ${b.x + b.w + 120},${640 - b.h}`}
            fill={`url(#t1g-${b.c})`}
            opacity="0.55"
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * Each page gets its own hero:
 *  - home: two-tone statement + gradient ribbons + bento strip
 *  - about: split profile — copy on the left, framed photo with value chips on the right
 *  - contact: centred title with direct-line cards (phone / email / visit)
 *  - extra pages: breadcrumb page header over a thin ribbon band
 * Later heroes on a page (not first) render as a simple statement block.
 */
export default function T1Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, photos, profile, valueTitles, serviceNames, pageKind, pageLabel } = useT1();
  const { set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Clear advice. Measurable results.";
  const subtext =
    section.subtext ||
    `${profile.business_name} partners with organisations to solve complex problems, strengthen operations and grow with confidence.`;
  const ctaText = section.ctaText || "Book a consultation";
  const photo = photos[0];
  const points = (valueTitles.length ? valueTitles : ["Senior-led engagements", "Transparent pricing", "Proven methods"]).slice(0, 3);
  const checklist = (serviceNames.length ? serviceNames : ["Strategy & planning", "Operations", "Advisory"]).slice(0, 4);

  const strong = (
    <EditableText as="span" className="t1-hero-strong" value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const soft = (
    <EditableText as="span" className="t1-hero-soft" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
  );
  const cta = (
    <a className="t1-btn" href={section.ctaHref || `${baseUrl}/contact`}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    return (
      <section className="t1-hero t1-hero-about">
        <div className="t1-container t1-about-hero">
          <div className="t1-hero-copy t1-reveal">
            <span className="t1-over">About {profile.business_name}</span>
            <h1 className="t1-h1 t1-hero-title">
              {strong} {soft}
            </h1>
            <div className="t1-hero-actions">
              {cta}
              <a className="t1-btn t1-btn-outline" href={`${baseUrl}/contact`}>
                Get in touch
              </a>
            </div>
          </div>
          <div className="t1-about-frame t1-reveal" aria-hidden="true">
            <div className="t1-about-photo">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" />
              ) : (
                <span className="t1-bento-glyph">{profile.business_name.slice(0, 1)}</span>
              )}
            </div>
            <ul className="t1-about-chips">
              {points.map((p) => (
                <li key={p}>
                  <span className="t1-tick">
                    <IconCheck />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const lines = [
      profile.phone ? { label: "Call", value: profile.phone, href: buildTelLink(profile.phone) } : null,
      profile.email ? { label: "Email", value: profile.email, href: buildEmailLink(profile.email) } : null,
      profile.address ? { label: "Visit", value: profile.address, href: null } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; href: string | null }>;
    return (
      <section className="t1-hero t1-hero-contact">
        <div className="t1-container t1-contact-hero t1-reveal">
          <span className="t1-pill">
            <span>Usually replies within one business day</span>
          </span>
          <h1 className="t1-h1 t1-hero-title">
            {strong} {soft}
          </h1>
          {lines.length ? (
            <div className="t1-lines">
              {lines.map((l) => {
                const body = (
                  <>
                    <span className="t1-mono">{l.label}</span>
                    <strong>{l.value}</strong>
                    {l.href ? <IconArrow size={16} /> : null}
                  </>
                );
                return l.href ? (
                  <a key={l.label} className="t1-line-card" href={l.href}>
                    {body}
                  </a>
                ) : (
                  <div key={l.label} className="t1-line-card">
                    {body}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    return (
      <section className="t1-hero t1-hero-page">
        <div className="t1-container t1-page-hero t1-reveal">
          <nav className="t1-crumbs" aria-label="Breadcrumb">
            <a href={`${baseUrl}/`}>Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{pageLabel || "Page"}</span>
          </nav>
          <div className="t1-page-hero-grid">
            <h1 className="t1-h1 t1-hero-title">{strong}</h1>
            <div className="t1-page-hero-side">
              <EditableText as="p" className="t1-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
              <div className="t1-hero-actions">{cta}</div>
            </div>
          </div>
        </div>
        <div className="t1-band" aria-hidden="true" />
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t1-hero t1-hero-plain">
        <div className="t1-container t1-hero-top">
          <div className="t1-hero-copy t1-reveal">
            <h2 className="t1-h2 t1-hero-title">
              {strong} {soft}
            </h2>
            <div className="t1-hero-actions">{cta}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="t1-hero" data-primary="true">
      <div className="t1-hero-stage">
        <Ribbons />
        <div className="t1-container t1-hero-top">
          <div className="t1-hero-copy t1-reveal">
            <a className="t1-pill" href="#services">
              <span>{profile.tagline || profile.business_name}</span>
              <IconArrow size={14} />
            </a>
            <h1 className="t1-h1 t1-hero-title">
              {strong} {soft}
            </h1>
            <div className="t1-hero-actions">
              {cta}
              <a className="t1-btn t1-btn-outline" href="#services">
                Our services
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="t1-container t1-hero-bento t1-reveal">
        <div className="t1-bento t1-bento-photo" aria-hidden="true">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" />
          ) : (
            <span className="t1-bento-glyph">{profile.business_name.slice(0, 1)}</span>
          )}
        </div>
        <div className="t1-bento t1-bento-list">
          <span className="t1-over">How we help</span>
          <ul>
            {checklist.map((c) => (
              <li key={c}>
                <span className="t1-tick">
                  <IconCheck />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="t1-bento t1-bento-points">
          {points.map((p, i) => (
            <div key={p}>
              <span className="t1-mono">0{i + 1}</span>
              <strong>{p}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
