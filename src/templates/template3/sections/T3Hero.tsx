"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "../edit";
import { T3ArrowIcon } from "../ui";

/** Splits "Design that lasts" → ["Design that", "lasts"] so the last word can be italic. */
function splitLastWord(text: string): [string, string] {
  const trimmed = text.trim();
  const i = trimmed.lastIndexOf(" ");
  return i === -1 ? ["", trimmed] : [trimmed.slice(0, i), trimmed.slice(i + 1)];
}

export default function T3Hero({
  section,
  sectionIndex,
  businessName,
  available,
  secondary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  businessName: string;
  /** Show the "available" status + seal (first hero on a page). */
  available?: boolean;
  secondary?: { href: string; label: string } | null;
}) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Thoughtful work, made to last";
  const subtext =
    section.subtext ||
    "Write a clear, benefit-focused description of what you do, who you help, and what outcomes people can expect.";
  const ctaText = section.ctaText || "Start a project";
  const [head, tail] = splitLastWord(headline);
  const sealText = `${businessName} • Portfolio • `.toUpperCase();

  return (
    <section className="t3-hero">
      <div className="t3-container">
        <div className="t3-hero-top">
          <span className="t3-index">
            <b>{businessName}</b> — Portfolio
          </span>
          {available ? (
            <span className="t3-status">
              <i aria-hidden="true" />
              Available for new projects
            </span>
          ) : null}
        </div>

        {enabled ? (
          <EditableText
            as="h1"
            className="t3-display t3-hero-title"
            value={headline}
            placeholder="Hero headline"
            multiline
            onCommit={(next) => set({ headline: next })}
          />
        ) : (
          <h1 className="t3-display t3-hero-title">
            {head ? `${head} ` : null}
            <em>{tail}</em>
          </h1>
        )}

        <div className="t3-hero-bottom">
          <div>
            <EditableText
              as="p"
              className="t3-lead"
              value={subtext}
              placeholder="Hero subtext"
              multiline
              onCommit={(next) => set({ subtext: next })}
            />
            <div className="t3-hero-actions">
              <a className="t3-btn" href={section.ctaHref || "#contact"}>
                <EditableText
                  as="span"
                  value={ctaText}
                  placeholder="CTA"
                  onCommit={(next) => set({ ctaText: next })}
                />
                <span className="t3-arrow">
                  <T3ArrowIcon />
                </span>
              </a>
              {secondary ? (
                <a className="t3-btn t3-btn-ghost" href={secondary.href}>
                  {secondary.label}
                </a>
              ) : null}
            </div>
          </div>

          {available ? (
            <div className="t3-seal" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <defs>
                  <path id="t3-seal-path" d="M60,60 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0" />
                </defs>
                <text>
                  {/* textLength fits any name exactly around the circle (2π·48 ≈ 301). */}
                  <textPath href="#t3-seal-path" textLength="298" lengthAdjust="spacingAndGlyphs">
                    {sealText}
                  </textPath>
                </text>
              </svg>
              <span className="t3-seal-core">{initials(businessName)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
