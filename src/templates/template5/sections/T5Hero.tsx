"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { bookHref, useT5 } from "../ctx";
import { IconCalendar, IconSparkle } from "../icons";

function splitLastWord(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  return i === -1 ? ["", t] : [t.slice(0, i), t.slice(i + 1)];
}

export default function T5Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT5();
  const { photos, profile, serviceNames } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Soft glam, made for you";
  const subtext =
    section.subtext ||
    "Polished, skin-first beauty for weddings, events and every day — in a calm studio where you feel looked after.";
  const ctaText = section.ctaText || "Book an appointment";
  const [head, tail] = splitLastWord(headline);
  const [p1, p2] = [photos[0], photos[1]];

  return (
    <section className="t5-hero">
      <div className="t5-container t5-hero-grid">
        <div className="t5-hero-copy t5-reveal">
          <span className="t5-eyebrow">{primary ? "Beauty studio · By appointment" : profile.business_name}</span>
          {enabled ? (
            <EditableText
              as="h1"
              className="t5-display"
              value={headline}
              placeholder="Hero headline"
              multiline
              onCommit={(next) => set({ headline: next })}
            />
          ) : (
            <h1 className="t5-display">
              {head ? `${head} ` : null}
              <em>{tail}</em>
            </h1>
          )}
          <EditableText
            as="p"
            className="t5-lead"
            value={subtext}
            placeholder="Hero subtext"
            multiline
            onCommit={(next) => set({ subtext: next })}
          />
          <div className="t5-hero-actions">
            <a className="t5-btn" href={section.ctaHref || bookHref(ctx)}>
              <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
            </a>
            <a className="t5-btn t5-btn-ghost" href="#services">
              View services
            </a>
          </div>
          {primary && serviceNames.length ? (
            <div className="t5-hero-note">
              <b>{serviceNames.length}</b>
              <span>signature services, each tailored to your features, skin and occasion.</span>
            </div>
          ) : null}
        </div>

        {primary ? (
          <div className="t5-hero-art t5-reveal" aria-hidden="true">
            <div className="t5-arch">
              {p1 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p1.url} alt="" />
              ) : (
                <span className="t5-monogram">{initials(profile.business_name)}</span>
              )}
            </div>
            <div className="t5-arch">
              {p2 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p2.url} alt="" />
              ) : (
                <IconSparkle size={40} />
              )}
            </div>
            <span className="t5-sparkle" style={{ top: "4%", right: "6%" }}>
              <IconSparkle size={26} />
            </span>
            <span className="t5-sparkle" style={{ top: "42%", left: "56%", animationDelay: "1.2s" }}>
              <IconSparkle size={16} />
            </span>
            <span className="t5-pill-float">
              <i>
                <IconCalendar />
              </i>
              Now taking bookings
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
