"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import type { NavPage, TemplateProps } from "@/templates/registry";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { initials, pad2, useSectionEditor } from "../edit";
import { T3ArrowIcon } from "../ui";

export type T3PageKind = "home" | "about" | "contact" | "extra";
export type T3HeroData = {
  photos: Array<{ url: string; alt: string }>;
  highlights: string[];
  projects: string[];
};

/** "Design that lasts" → ["Design that", "lasts"] so the last word can be set in serif italic. */
function splitLastWord(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  return i === -1 ? ["", t] : [t.slice(0, i), t.slice(i + 1)];
}

/** Frosted window chrome used by several heroes. */
function GlassWindow({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="t3-window">
      <div className="t3-window-bar">
        <span className="t3-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="t3-window-title">{title}</span>
        {aside ? <span className="t3-window-aside">{aside}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Light "glass" heroes, one per page:
 *  - home: headline with a serif-italic last word, pill buttons, frosted project window
 *  - about: highlighted sentence (keywords as numbered chips) beside a glass portrait card
 *  - contact: frosted "inbox" of ways to reach you
 *  - extra pages: numbered title with a glass tab bar of sibling pages
 * Later heroes on a page render as a quiet statement.
 */
export default function T3Hero({
  section,
  sectionIndex,
  businessName,
  available,
  secondary,
  pageKind = "home",
  pageLabel = "",
  pageNumber = 1,
  heroData = { photos: [], highlights: [], projects: [] },
  profile,
  navPages = [],
  baseUrl = "",
}: {
  section: HeroSection;
  sectionIndex?: number;
  businessName: string;
  /** First hero on a page gets the page-specific layout. */
  available?: boolean;
  secondary?: { href: string; label: string } | null;
  pageKind?: T3PageKind;
  pageLabel?: string;
  pageNumber?: number;
  heroData?: T3HeroData;
  profile?: TemplateProps["profile"];
  navPages?: NavPage[];
  baseUrl?: string;
}) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "Thoughtful work, made to last";
  const subtext =
    section.subtext ||
    "Write a clear, benefit-focused description of what you do, who you help, and what outcomes people can expect.";
  const ctaText = section.ctaText || "Start a project";
  const [head, tail] = splitLastWord(headline);
  const { photos, highlights, projects } = heroData;

  const title = (cls: string, Tag: "h1" | "h2" = "h1") =>
    enabled ? (
      <EditableText as={Tag} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
    ) : (
      <Tag className={cls}>
        {head ? `${head} ` : null}
        <em>{tail}</em>
      </Tag>
    );
  const lead = <EditableText as="p" className="t3-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />;
  const cta = (
    <a className="t3-btn" href={section.ctaHref || "#contact"}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
    </a>
  );
  const ghost = secondary ? (
    <a className="t3-btn t3-btn-ghost" href={secondary.href}>
      {secondary.label}
    </a>
  ) : null;

  const variant: T3PageKind | "plain" = available ? pageKind : "plain";

  if (variant === "about") {
    const words = (highlights.length ? highlights : ["Clarity", "Craft", "Care"]).slice(0, 3);
    const portrait = photos[1] ?? photos[0];
    return (
      <section className="t3-hero t3-hero-about">
        <div className="t3-glow" aria-hidden="true" />
        <div className="t3-container t3-about-grid">
          <div className="t3-about-copy t3-reveal">
            <span className="t3-chip-label">About</span>
            {title("t3-display t3-hero-title")}
            <p className="t3-highlight">
              {businessName} brings{" "}
              {words.map((w, i) => (
                <span key={w}>
                  <mark>{w}</mark>
                  <sup>{pad2(i + 1)}</sup>
                  {i < words.length - 2 ? ", " : i === words.length - 2 ? " and " : " "}
                </span>
              ))}
              <span className="t3-highlight-tail">to every project, from first call to final hand-off.</span>
            </p>
            {lead}
            <div className="t3-hero-actions">
              {cta}
              {ghost}
            </div>
          </div>
          <figure className="t3-portrait-card t3-reveal">
            <div className="t3-portrait-img">
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait.url} alt={portrait.alt} />
              ) : (
                <span>{initials(businessName)}</span>
              )}
            </div>
            <figcaption>
              <b>{businessName}</b>
              <span>{profile?.address || profile?.tagline || "Independent practice"}</span>
            </figcaption>
          </figure>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const rows = [
      profile?.email ? { k: "Email", v: profile.email, href: buildEmailLink(profile.email), tag: "Fastest" } : null,
      profile?.phone ? { k: "Phone", v: profile.phone, href: buildTelLink(profile.phone), tag: "Weekdays" } : null,
      profile?.whatsapp ? { k: "WhatsApp", v: "Send a message", href: buildWhatsAppLink(profile.whatsapp), tag: "Anytime" } : null,
      profile?.address ? { k: "Studio", v: profile.address, href: null, tag: "By appointment" } : null,
    ].filter(Boolean) as Array<{ k: string; v: string; href: string | null; tag: string }>;
    return (
      <section className="t3-hero t3-hero-contact">
        <div className="t3-glow" aria-hidden="true" />
        <div className="t3-container t3-contact-grid-hero">
          <div className="t3-hero-copy t3-reveal">
            <span className="t3-status">
              <i aria-hidden="true" />
              Replying within a day
            </span>
            {title("t3-display t3-hero-title")}
            {lead}
          </div>
          <div className="t3-reveal">
            <GlassWindow title="Inbox" aside={`${rows.length} ways`}>
              <ul className="t3-inbox">
                {rows.map((r, i) => {
                  const body = (
                    <>
                      <span className="t3-inbox-num">#{pad2(i + 1)}</span>
                      <span className="t3-inbox-main">
                        <b>{r.k}</b>
                        <span>{r.v}</span>
                      </span>
                      <span className="t3-inbox-tag">{r.tag}</span>
                    </>
                  );
                  return (
                    <li key={r.k}>
                      {r.href ? (
                        <a href={r.href} target={r.k === "WhatsApp" ? "_blank" : undefined} rel="noreferrer">
                          {body}
                        </a>
                      ) : (
                        <div>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </GlassWindow>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const tabs = [{ key: "", label: "Home", href: `${baseUrl}/` }, ...navPages.map((p) => ({ key: p.key, label: p.label, href: navPageHref(baseUrl, p) }))];
    return (
      <section className="t3-hero t3-hero-page">
        <div className="t3-glow" aria-hidden="true" />
        <div className="t3-container t3-page-hero t3-reveal">
          <nav className="t3-tabs" aria-label="Pages">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} data-active={t.label === pageLabel}>
                {t.label}
              </Link>
            ))}
          </nav>
          <span className="t3-page-num">{pad2(pageNumber)}</span>
          {title("t3-display t3-hero-title")}
          {lead}
          {ghost ? <div className="t3-hero-actions">{ghost}</div> : null}
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t3-hero t3-hero-plain">
        <div className="t3-container t3-hero-copy t3-reveal">
          {title("t3-title", "h2")}
          {lead}
          <div className="t3-hero-actions">{cta}</div>
        </div>
      </section>
    );
  }

  const list = (projects.length ? projects : ["Brand identity", "Website", "Campaign"]).slice(0, 4);
  const shot = photos[0];

  return (
    <section className="t3-hero t3-hero-home">
      <div className="t3-glow" aria-hidden="true" />
      <div className="t3-container">
        <div className="t3-hero-copy t3-reveal">
          <span className="t3-status">
            <i aria-hidden="true" />
            Available for new projects
          </span>
          {title("t3-display t3-hero-title")}
          {lead}
          <div className="t3-hero-actions">
            {cta}
            {ghost}
          </div>
        </div>

        <div className="t3-hero-window t3-reveal" aria-hidden="true">
          <GlassWindow title={`${businessName} — Selected work`} aside={<T3ArrowIcon size={14} />}>
            <div className="t3-window-body">
              <ul className="t3-window-list">
                {list.map((p, i) => (
                  <li key={p} data-active={i === 0}>
                    <span>#{pad2(i + 1)}</span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="t3-window-shot">
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt="" />
                ) : (
                  <span>{initials(businessName)}</span>
                )}
                <div className="t3-window-card">
                  <b>{list[0]}</b>
                  <span>{shot?.alt || profile?.tagline || "Case study"}</span>
                </div>
              </div>
            </div>
          </GlassWindow>
        </div>
      </div>
    </section>
  );
}
