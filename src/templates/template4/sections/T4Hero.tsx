"use client";

import { useState, type ReactNode } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT4 } from "../ctx";
import { FEATURE_ICONS, IconArrow, IconCheck } from "../icons";

/** Spotlight beam + grid rails + crosshair marks behind a hero. */
function Stage() {
  return (
    <div className="t4-stagefx" aria-hidden="true">
      <span className="t4-beam" />
      <span className="t4-rail t4-rail-l" />
      <span className="t4-rail t4-rail-r" />
      <span className="t4-x t4-x-l">×</span>
      <span className="t4-x t4-x-r">×</span>
      <span className="t4-stars" />
    </div>
  );
}

/** "Introducing" label flanked by hairlines. */
function Intro({ children }: { children: ReactNode }) {
  return (
    <span className="t4-intro">
      <i />
      {children}
      <i />
    </span>
  );
}

/**
 * Product heroes, one per page (all work in light and dark mode):
 *  - home: spotlight beam, glowing gradient headline, floating "product card" of features
 *  - about: milestone timeline built from the site's values
 *  - contact: terminal-style card with copyable contact commands
 *  - extra pages: title framed by a crosshair box
 * Later heroes on a page render as a compact centred statement.
 */
export default function T4Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, featureNames, valueTitles, profile, pageKind, pageLabel } = useT4();
  const { set } = useSectionEditor(section, sectionIndex);
  const [copied, setCopied] = useState<string | null>(null);
  const headline = section.headline || "The simpler way to get it done";
  const subtext =
    section.subtext ||
    "Everything you need in one place — set up in minutes, loved by the people who use it every day.";
  const ctaText = section.ctaText || "Get started";
  const features = (featureNames.length ? featureNames : ["Fast setup", "Smart reminders", "Live tracking", "Secure payments"]).slice(0, 4);

  const title = (cls: string) => (
    <EditableText as="h1" className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead = <EditableText as="p" className="t4-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />;
  const cta = (
    <a className="t4-btn t4-btn-accent" href={section.ctaHref || `${baseUrl}/contact`}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={16} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const steps = (valueTitles.length ? valueTitles : ["The idea", "First customers", "Built to scale"]).slice(0, 4);
    return (
      <section className="t4-hero t4-hero-about">
        <Stage />
        <div className="t4-container t4-about-hero">
          <div className="t4-hero-copy t4-reveal">
            <Intro>Our story</Intro>
            {title("t4-h1 t4-glow-text")}
            {lead}
            <div className="t4-hero-actions">{cta}</div>
          </div>
          <ol className="t4-timeline t4-reveal">
            {steps.map((s, i) => (
              <li key={s}>
                <span className="t4-timeline-dot" />
                <small>{pad2(i + 1)}</small>
                <b>{s}</b>
              </li>
            ))}
            <li data-now="true">
              <span className="t4-timeline-dot" />
              <small>Now</small>
              <b>{profile.business_name}</b>
            </li>
          </ol>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const cmds = [
      profile.email ? { cmd: `email ${profile.email}`, copy: profile.email, href: buildEmailLink(profile.email) } : null,
      profile.phone ? { cmd: `call ${profile.phone}`, copy: profile.phone, href: buildTelLink(profile.phone) } : null,
      profile.whatsapp ? { cmd: "chat --whatsapp", copy: profile.whatsapp, href: buildWhatsAppLink(profile.whatsapp) } : null,
      profile.address ? { cmd: `visit "${profile.address}"`, copy: profile.address, href: null } : null,
    ].filter(Boolean) as Array<{ cmd: string; copy: string; href: string | null }>;
    const copy = (v: string) => {
      navigator.clipboard?.writeText(v).then(
        () => {
          setCopied(v);
          setTimeout(() => setCopied(null), 1600);
        },
        () => undefined,
      );
    };
    return (
      <section className="t4-hero t4-hero-contact">
        <Stage />
        <div className="t4-container t4-contact-hero">
          <div className="t4-hero-copy t4-reveal">
            <Intro>Talk to us</Intro>
            {title("t4-h1 t4-glow-text")}
            {lead}
          </div>
          <div className="t4-term t4-reveal">
            <div className="t4-term-bar">
              <i />
              <i />
              <i />
              <span>contact — {profile.business_name.toLowerCase().replace(/\s+/g, "-")}</span>
            </div>
            <div className="t4-term-body">
              {cmds.map((c) => (
                <div key={c.cmd} className="t4-term-line">
                  <span className="t4-term-prompt">$</span>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      {c.cmd}
                    </a>
                  ) : (
                    <span>{c.cmd}</span>
                  )}
                  <button type="button" onClick={() => copy(c.copy)} aria-label={`Copy ${c.copy}`}>
                    {copied === c.copy ? "copied" : "copy"}
                  </button>
                </div>
              ))}
              <div className="t4-term-line t4-term-ok">
                <span className="t4-term-prompt">✓</span>
                <span>We usually reply within one business day.</span>
              </div>
              <div className="t4-term-line">
                <span className="t4-term-prompt">$</span>
                <span className="t4-caret" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    return (
      <section className="t4-hero t4-hero-page">
        <Stage />
        <div className="t4-container">
          <div className="t4-frame t4-reveal">
            <span className="t4-corner t4-corner-tl" />
            <span className="t4-corner t4-corner-tr" />
            <span className="t4-corner t4-corner-bl" />
            <span className="t4-corner t4-corner-br" />
            <Intro>{pageLabel || profile.business_name}</Intro>
            {title("t4-h1 t4-glow-text")}
            {lead}
            <div className="t4-hero-actions">{cta}</div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t4-hero t4-hero-plain">
        <div className="t4-container t4-hero-copy t4-center t4-reveal">
          {title("t4-h2")}
          {lead}
          <div className="t4-hero-actions">{cta}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="t4-hero t4-hero-home">
      <Stage />
      <div className="t4-container">
        <div className="t4-hero-copy t4-center t4-reveal">
          <Intro>{profile.tagline || `Introducing ${profile.business_name}`}</Intro>
          {title("t4-h1 t4-glow-text t4-hero-title")}
          {lead}
          <div className="t4-hero-actions">
            {cta}
            <a className="t4-btn t4-btn-light" href="#features">
              See how it works
            </a>
          </div>
        </div>

        <div className="t4-product t4-reveal" aria-hidden="true">
          <div className="t4-product-halo" />
          <div className="t4-product-card">
            <div className="t4-product-head">
              <span className="t4-logo" />
              <b>{profile.business_name}</b>
              <small>All systems ready</small>
            </div>
            <ul>
              {features.map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                return (
                  <li key={f} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                    <i>
                      <Icon size={16} />
                    </i>
                    <span>{f}</span>
                    <em>
                      <IconCheck size={13} />
                    </em>
                  </li>
                );
              })}
            </ul>
            <div className="t4-product-cta">
              {ctaText}
              <IconArrow size={15} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
