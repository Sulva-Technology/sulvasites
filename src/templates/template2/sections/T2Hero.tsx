"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { useT2 } from "../ctx";

function splitLastWord(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  return i === -1 ? ["", t] : [t.slice(0, i), t.slice(i + 1)];
}

/** "Cover story": big photo (or red type block) beside the headline, deck and byline. */
export default function T2Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, photos, profile } = useT2();
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Ideas, made visible";
  const subtext =
    section.subtext || "An independent studio telling stories through design, image and words — for brands with something to say.";
  const ctaText = section.ctaText || "Work with us";
  const [head, tail] = splitLastWord(headline);
  const photo = photos[0];

  const title = enabled ? (
    <EditableText as="h1" className="t2-display" value={headline} placeholder="Headline" multiline onCommit={(next) => set({ headline: next })} />
  ) : (
    <h1 className="t2-display">
      {head ? `${head} ` : null}
      <em>{tail}</em>
    </h1>
  );

  const deck = (
    <EditableText as="p" className="t2-deck" value={subtext} placeholder="Deck" multiline onCommit={(next) => set({ subtext: next })} />
  );

  const actions = (
    <div className="t2-cover-actions">
      <a className="t2-btn" href={section.ctaHref || `${baseUrl}/contact`}>
        <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      </a>
      <a className="t2-btn t2-btn-line" href="#stories">
        Read more
      </a>
    </div>
  );

  if (!primary) {
    return (
      <section className="t2-cover">
        <div className="t2-container t2-cover-plain t2-reveal">
          <span className="t2-kicker">{profile.business_name}</span>
          {title}
          {deck}
        </div>
      </section>
    );
  }

  return (
    <section className="t2-cover">
      <div className="t2-container t2-cover-grid">
        <div className="t2-cover-media t2-reveal">
          {photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt || ""} />
              {photo.alt ? <span className="t2-cover-caption">{photo.alt}</span> : null}
            </>
          ) : (
            <span className="t2-cover-type" aria-hidden="true">
              {initials(profile.business_name)}
            </span>
          )}
        </div>
        <div className="t2-cover-copy t2-reveal">
          <span className="t2-kicker">Cover story</span>
          {title}
          {deck}
          <div className="t2-byline">
            <span className="t2-meta">By {profile.business_name}</span>
            {profile.address ? <span className="t2-meta">{profile.address}</span> : null}
          </div>
          {actions}
        </div>
      </div>
    </section>
  );
}
