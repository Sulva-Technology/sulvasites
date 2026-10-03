"use client";

import { useSyncExternalStore } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { initials, pad2, useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { bookHref, useT5 } from "../ctx";
import { IconArrow, IconCalendar, IconSparkle } from "../icons";

function Photo({ src, fallback }: { src?: string; fallback: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" />
  ) : (
    <span className="t5-photo-fallback">{fallback}</span>
  );
}

/** The next few days as booking chips (labels only — they link to the booking form). */
function upcomingDays(n: number) {
  const out: Array<{ day: string; date: string }> = [];
  const d = new Date();
  for (let i = 1; out.length < n && i < 14; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (x.getDay() === 0) continue;
    out.push({ day: x.toLocaleDateString("en-GB", { weekday: "short" }), date: String(x.getDate()) });
  }
  return out;
}

type Day = { day: string; date: string };
const NO_DAYS: Day[] = [];
let dayCache: { key: string; days: Day[] } | null = null;
/** Stable per-day snapshot of upcoming days (client only — depends on the visitor's clock). */
function clientDays() {
  const key = new Date().toDateString();
  if (!dayCache || dayCache.key !== key) dayCache = { key, days: upcomingDays(5) };
  return dayCache.days;
}
const noSubscribe = () => () => {};

/**
 * Beauty heroes, one per page (light and dark mode):
 *  - home: rounded full-width photo card, award pill, headline + pills, glass "in progress"
 *    card and a stats row across the bottom
 *  - about: centred award pill and headline over a phone-framed portrait
 *  - contact: booking card with upcoming days + direct lines
 *  - extra pages: soft blurred blob header with service chips
 */
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
  const { photos, profile, serviceNames, valueTitles, pageKind, pageLabel } = ctx;
  const { set } = useSectionEditor(section, sectionIndex);
  // Dates depend on the visitor's clock/locale, so the server renders none.
  const days = useSyncExternalStore(noSubscribe, clientDays, () => NO_DAYS);
  const headline = section.headline || "Soft glam, made for you";
  const subtext =
    section.subtext ||
    "Polished, skin-first beauty for weddings, events and every day — in a calm studio where you feel looked after.";
  const ctaText = section.ctaText || "Book an appointment";
  const mono = initials(profile.business_name);
  const services = (serviceNames.length ? serviceNames : ["Bridal glam", "Soft glam", "Brows & lashes", "Skin prep"]).slice(0, 5);

  const title = (cls: string) => (
    <EditableText as="h1" className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead = (cls = "t5-lead") => (
    <EditableText as="p" className={cls} value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
  );
  const cta = (cls = "t5-btn") => (
    <a className={cls} href={section.ctaHref || bookHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
    </a>
  );
  const award = (
    <span className="t5-award">
      <IconSparkle size={14} />
      {profile.tagline || "Loved by clients across the city"}
    </span>
  );

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    return (
      <section className="t5-hero t5-hero-about">
        <div className="t5-container t5-center t5-reveal">
          {award}
          {title("t5-display t5-hero-title")}
          {lead()}
        </div>
        <div className="t5-phone t5-reveal" aria-hidden="true">
          <div className="t5-phone-screen">
            <Photo src={photos[1]?.url ?? photos[0]?.url} fallback={mono} />
            <div className="t5-scan">
              <span>Consultation in progress…</span>
              <i />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    const lines = [
      profile.phone ? { k: "Call", v: profile.phone, href: buildTelLink(profile.phone) } : null,
      profile.whatsapp ? { k: "WhatsApp", v: "Message us", href: buildWhatsAppLink(profile.whatsapp) } : null,
      profile.email ? { k: "Email", v: profile.email, href: buildEmailLink(profile.email) } : null,
    ].filter(Boolean) as Array<{ k: string; v: string; href: string }>;
    return (
      <section className="t5-hero t5-hero-contact">
        <div className="t5-container t5-contact-hero">
          <div className="t5-hero-copy t5-reveal">
            {award}
            {title("t5-display t5-hero-title")}
            {lead()}
            {profile.address ? <p className="t5-muted t5-address">{profile.address}</p> : null}
          </div>
          <div className="t5-booking-card t5-reveal">
            <div className="t5-booking-head">
              <IconCalendar />
              <b>Pick a day</b>
              <small>Next available</small>
            </div>
            <div className="t5-days">
              {days.map((d, i) => (
                <a key={d.day + d.date} href={bookHref(ctx)} data-first={i === 0}>
                  <small>{d.day}</small>
                  <b>{d.date}</b>
                </a>
              ))}
            </div>
            <div className="t5-lines">
              {lines.map((l) => (
                <a key={l.k} href={l.href} target={l.k === "WhatsApp" ? "_blank" : undefined} rel="noreferrer">
                  <small>{l.k}</small>
                  <span>{l.v}</span>
                  <IconArrow />
                </a>
              ))}
            </div>
            {cta("t5-btn t5-btn-block")}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    return (
      <section className="t5-hero t5-hero-page">
        <span className="t5-blob" aria-hidden="true" />
        <div className="t5-container t5-center t5-reveal">
          <span className="t5-chip-label">{pageLabel || profile.business_name}</span>
          {title("t5-display t5-hero-title")}
          {lead()}
          <div className="t5-chips">
            {services.map((s) => (
              <a key={s} href={bookHref(ctx, s)}>
                {s}
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t5-hero t5-hero-plain">
        <div className="t5-container t5-center t5-reveal">
          {title("t5-title")}
          {lead()}
          {cta()}
        </div>
      </section>
    );
  }

  const stats = (valueTitles.length ? valueTitles : ["Skin-first", "Long-wear", "By appointment"]).slice(0, 3);

  return (
    <section className="t5-hero t5-hero-home">
      <div className="t5-cover t5-reveal">
        <div className="t5-cover-img" aria-hidden="true">
          <Photo src={photos[0]?.url} fallback={mono} />
        </div>
        <div className="t5-cover-copy">
          {award}
          {title("t5-display t5-hero-title")}
          {lead("t5-lead t5-cover-lead")}
          <div className="t5-hero-actions">
            {cta("t5-btn t5-btn-light")}
            <a className="t5-btn t5-btn-glass" href="#services">
              View services
            </a>
          </div>
        </div>
        <div className="t5-progress" aria-hidden="true">
          <span>
            <i />
            {services[0]} · in progress
          </span>
          <b>
            <em />
          </b>
        </div>
        <dl className="t5-stats">
          {stats.map((s, i) => (
            <div key={s}>
              <dt>{pad2(i + 1)}</dt>
              <dd>{s}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
