"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import T17Subscribe from "../components/T17Subscribe";
import { blogHref, useT17 } from "../ctx";
import { IconArrow } from "../icons";

/**
 * Heroes, one per page kind:
 *  - home: an issue line, a large serif headline, the lead and an inline subscribe form
 *  - about: portrait (first gallery photo) beside the headline and lead
 *  - contact: centred headline and lead
 *  - extra pages and the blog (posts included): breadcrumb, centred serif headline, lead
 * Later heroes on a page render as a ruled call-to-action.
 */
export default function T17Hero({ section, sectionIndex, primary }: { section: HeroSection; sectionIndex?: number; primary?: boolean }) {
  const ctx = useT17();
  const { profile, pageKind, pageLabel, baseUrl, photos, blog } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  const headline = section.headline || (enabled ? "" : profile.business_name);
  const subtext = section.subtext || (enabled ? "" : profile.tagline || "");

  const title = (cls: string, as: "h1" | "h2" = "h1") => (
    <EditableText as={as} className={cls} value={headline} placeholder="Headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead = (cls: string) =>
    subtext || enabled ? (
      <EditableText as="p" className={cls} value={subtext} placeholder="A sentence about what you write" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (fallback: string, href: string, cls = "t17-btn t17-btn-solid") => {
    const text = section.ctaText || (enabled ? "" : fallback);
    if (!text && !enabled) return null;
    return (
      <a className={cls} href={section.ctaHref || href}>
        <EditableText as="span" value={text} placeholder={fallback} onCommit={(next) => set({ ctaText: next })} />
        <IconArrow size={16} />
      </a>
    );
  };

  if (!primary) {
    return (
      <section className="t17-section">
        <div className="t17-container">
          <div className="t17-cta t17-reveal">
            {title("t17-h2", "h2")}
            {lead("t17-lead")}
            {cta("Read the latest", blogHref(ctx))}
          </div>
        </div>
      </section>
    );
  }

  if (pageKind === "about") {
    const photo = photos[0];
    return (
      <section className="t17-hero t17-hero-about">
        <div className="t17-container t17-hero-about-grid">
          <div className="t17-hero-about-text t17-reveal">
            <p className="t17-kicker">About</p>
            {title("t17-display")}
            {lead("t17-lead t17-lead-lg")}
            {cta("Get in touch", `${baseUrl}/contact`)}
          </div>
          {photo ? (
            <figure className="t17-portrait t17-reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} />
            </figure>
          ) : null}
        </div>
      </section>
    );
  }

  if (pageKind === "contact") {
    return (
      <section className="t17-hero t17-hero-center">
        <div className="t17-container t17-narrow t17-reveal">
          <p className="t17-kicker">Contact</p>
          {title("t17-display")}
          {lead("t17-lead t17-lead-lg")}
        </div>
      </section>
    );
  }

  if (pageKind === "extra") {
    return (
      <section className="t17-hero t17-hero-center t17-hero-extra">
        <div className="t17-container t17-narrow t17-reveal">
          <nav className="t17-crumbs" aria-label="Breadcrumb">
            <Link href={`${baseUrl}/`}>Home</Link>
            <span aria-hidden="true">/</span>
            <span>{pageLabel || "Page"}</span>
          </nav>
          {title("t17-display t17-display-extra")}
          {lead("t17-lead t17-lead-lg")}
        </div>
      </section>
    );
  }

  // Home
  const count = blog?.posts.length ?? 0;
  return (
    <section className="t17-hero t17-hero-home">
      <div className="t17-container">
        <div className="t17-issue t17-reveal">
          <span>{count > 0 ? `${count} ${count === 1 ? "story" : "stories"} so far` : "Notes & essays"}</span>
          <span>{profile.address ? profile.address.split(",").slice(-1)[0]!.trim() : "Independent"}</span>
        </div>
        <div className="t17-hero-home-grid">
          <div className="t17-reveal">
            {title("t17-display t17-display-home")}
          </div>
          <div className="t17-hero-home-side t17-reveal">
            {lead("t17-lead t17-lead-lg")}
            <T17Subscribe compact />
            <p className="t17-fine">
              Join the readers who get every new post. Or <Link href={blogHref(ctx)}>start reading</Link>.
            </p>
            {section.ctaText || enabled ? cta("Start reading", blogHref(ctx), "t17-btn t17-btn-ghost t17-btn-sm") : null}
          </div>
        </div>
      </div>
    </section>
  );
}
