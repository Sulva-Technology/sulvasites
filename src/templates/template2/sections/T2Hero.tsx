"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink } from "@/templates/shared/links";
import { useT2 } from "../ctx";

function Photo({ src, alt, fallback }: { src?: string; alt?: string; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} />
  ) : (
    <span className="t2-photo-fallback" aria-hidden="true">
      {fallback}
    </span>
  );
}

/**
 * Glossy-magazine heroes, one per page:
 *  - home: full-bleed cover photo, issue line, giant serif cover headline, cover lines
 *  - about: "profile" spread — tall portrait beside a standfirst and pull quote
 *  - contact: "letters" page — centred italic headline with contact lines
 *  - extra pages: feature opener — category, title, standfirst, three-image strip
 * Later heroes on a page render as a quiet centred statement.
 */
export default function T2Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, photos, profile, contents, pageKind, pageLabel } = useT2();
  const { set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Ideas, made visible";
  const subtext =
    section.subtext || "An independent studio telling stories through design, image and words — for brands with something to say.";
  const ctaText = section.ctaText || "Work with us";
  const mono = initials(profile.business_name);
  const year = new Date().getFullYear();

  const title = (cls: string) => (
    <EditableText as="h1" className={cls} value={headline} placeholder="Headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const deck = (cls: string) => (
    <EditableText as="p" className={cls} value={subtext} placeholder="Standfirst" multiline onCommit={(next) => set({ subtext: next })} />
  );
  const cta = (cls = "t2-btn") => (
    <a className={cls} href={section.ctaHref || `${baseUrl}/contact`}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
    </a>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const p = photos[1] ?? photos[0];
    return (
      <section className="t2-hero t2-hero-about">
        <div className="t2-about-spread">
          <div className="t2-about-photo t2-reveal">
            <Photo src={p?.url} alt={p?.alt} fallback={mono} />
            <span className="t2-caption">Photographed for {profile.business_name}</span>
          </div>
          <div className="t2-about-copy t2-reveal">
            <span className="t2-kicker">The Profile</span>
            {title("t2-title")}
            {deck("t2-standfirst")}
            {profile.description ? <blockquote className="t2-pull">“{profile.description}”</blockquote> : null}
            {cta()}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const lines = [
      profile.email ? { k: "Write", v: profile.email, href: buildEmailLink(profile.email) } : null,
      profile.phone ? { k: "Call", v: profile.phone, href: buildTelLink(profile.phone) } : null,
      profile.address ? { k: "Visit", v: profile.address, href: null } : null,
    ].filter(Boolean) as Array<{ k: string; v: string; href: string | null }>;
    return (
      <section className="t2-hero t2-hero-letters">
        <div className="t2-container t2-letters t2-reveal">
          <span className="t2-kicker">Letters to the studio</span>
          {title("t2-display")}
          {deck("t2-standfirst")}
          {lines.length ? (
            <dl className="t2-letters-lines">
              {lines.map((l) => (
                <div key={l.k}>
                  <dt>{l.k}</dt>
                  <dd>{l.href ? <a href={l.href}>{l.v}</a> : l.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const strip = photos.slice(0, 3);
    return (
      <section className="t2-hero t2-hero-feature">
        <div className="t2-container t2-feature t2-reveal">
          <span className="t2-kicker">
            {pageLabel || "Feature"} · {profile.business_name}
          </span>
          {title("t2-display")}
          {deck("t2-standfirst")}
        </div>
        <div className="t2-feature-strip t2-reveal" aria-hidden="true">
          {(strip.length ? strip : [undefined, undefined, undefined]).map((ph, i) => (
            <div key={i} className="t2-feature-img">
              <Photo src={ph?.url} alt={ph?.alt} fallback={pad2(i + 1)} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t2-hero t2-hero-plain">
        <div className="t2-container t2-feature t2-reveal">
          {title("t2-title")}
          {deck("t2-standfirst")}
          {cta()}
        </div>
      </section>
    );
  }

  const cover = photos[0];
  const lines = (contents.length ? contents : ["Brand stories", "Art direction", "Editorial design"]).slice(0, 3);

  return (
    <section className="t2-hero t2-cover" data-photo={cover ? "true" : "false"}>
      <div className="t2-cover-bg" aria-hidden="true">
        <Photo src={cover?.url} alt={cover?.alt} fallback={mono} />
      </div>
      <div className="t2-container t2-cover-inner">
        <div className="t2-cover-issue">
          <span>Issue Nº {String(year).slice(2)}</span>
          <span>{profile.tagline || "The independent edition"}</span>
        </div>

        <div className="t2-cover-main t2-reveal">
          {title("t2-cover-title")}
          <div className="t2-cover-foot">
            {deck("t2-cover-deck")}
            <div className="t2-cover-actions">
              {cta("t2-btn t2-btn-light")}
              <a className="t2-link-light" href="#stories">
                Read the issue
              </a>
            </div>
          </div>
        </div>

        <ol className="t2-cover-lines t2-reveal">
          {lines.map((l, i) => (
            <li key={l}>
              <span>{pad2(i + 1)}</span>
              {l}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
