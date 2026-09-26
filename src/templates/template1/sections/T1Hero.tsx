"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT1 } from "../ctx";
import { IconArrow, IconCheck, IconSkyline } from "../icons";

/** Split hero: copy + trust points on the left, photo with a checklist card on the right. */
export default function T1Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, photos, profile, valueTitles, serviceNames } = useT1();
  const { set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Clear advice. Measurable results.";
  const subtext =
    section.subtext ||
    `${profile.business_name} partners with organisations to solve complex problems, strengthen operations and grow with confidence.`;
  const ctaText = section.ctaText || "Book a consultation";
  const photo = photos[0];
  const points = (valueTitles.length ? valueTitles : ["Senior-led engagements", "Transparent pricing", "Proven methods"]).slice(0, 3);
  const checklist = (serviceNames.length ? serviceNames : ["Strategy & planning", "Operations", "Advisory"]).slice(0, 4);

  return (
    <section className="t1-hero">
      <div className="t1-container t1-hero-grid">
        <div className="t1-hero-copy t1-reveal">
          <span className="t1-over">{profile.business_name}</span>
          <EditableText
            as="h1"
            className="t1-h1"
            value={headline}
            placeholder="Hero headline"
            multiline
            onCommit={(next) => set({ headline: next })}
          />
          <EditableText as="p" className="t1-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
          <div className="t1-hero-actions">
            <a className="t1-btn" href={section.ctaHref || `${baseUrl}/contact`}>
              <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
              <IconArrow />
            </a>
            <a className="t1-btn t1-btn-outline" href="#services">
              Our services
            </a>
          </div>
          {primary ? (
            <div className="t1-hero-points">
              {points.map((p) => (
                <span key={p}>
                  <IconCheck /> {p}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {primary ? (
          <div className="t1-hero-visual t1-reveal" aria-hidden="true">
            <div className="t1-hero-img">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" />
              ) : (
                <IconSkyline />
              )}
            </div>
            <div className="t1-hero-card">
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
          </div>
        ) : null}
      </div>
    </section>
  );
}
