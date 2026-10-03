"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T8Hours from "../components/T8Hours";
import { bookHref, cityOf, directionsHref, useT8 } from "../ctx";
import {
  IconAlert,
  IconArrow,
  IconCalendar,
  IconChat,
  IconClock,
  IconCross,
  IconMail,
  IconPhone,
  IconPin,
} from "../icons";

const OTHER = "__other__";

/** "Book an appointment" card: pick a reason for the visit, continue to the contact form. */
function AppointmentCard() {
  const ctx = useT8();
  const { serviceNames, profile, hours, baseUrl } = ctx;
  const editor = useInlineEditor();
  const [choice, setChoice] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editor?.enabled) return; // stay in the editor preview
    if (!choice) return;
    const service = choice === OTHER ? "" : choice;
    const q = service ? `?service=${encodeURIComponent(service)}` : "";
    window.location.assign(`${baseUrl}/contact${q}#book`);
  };

  return (
    <div className="t8-appt t8-reveal">
      <div className="t8-appt-head">
        <span className="t8-appt-ico" aria-hidden="true">
          <IconCalendar size={20} />
        </span>
        <div>
          <h2 className="t8-appt-title">Book an appointment</h2>
          <p>Choose a reason for your visit to get started.</p>
        </div>
      </div>

      {serviceNames.length ? (
        <form className="t8-appt-form" onSubmit={onSubmit}>
          <label className="t8-field">
            <span>Reason for visit</span>
            <select
              className="t8-input"
              name="service"
              value={choice}
              required
              onChange={(e) => setChoice(e.target.value)}
            >
              <option value="" disabled>
                Choose a service
              </option>
              {serviceNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={OTHER}>Something else / not sure</option>
            </select>
          </label>
          <button type="submit" className="t8-btn t8-btn-block" disabled={!choice}>
            Continue <IconArrow size={16} />
          </button>
        </form>
      ) : (
        <a className="t8-btn t8-btn-block" href={bookHref(ctx)}>
          Request an appointment <IconArrow size={16} />
        </a>
      )}

      {profile.phone || hours[0] ? (
        <div className="t8-appt-foot">
          {profile.phone ? (
            <a href={buildTelLink(profile.phone)}>
              <IconPhone size={15} />
              <span>
                <small>Prefer to call?</small>
                {profile.phone}
              </span>
            </a>
          ) : null}
          {hours[0] ? (
            <span>
              <IconClock size={15} />
              <span>
                <small>Opening hours</small>
                {hours[0]}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Photo({ src, alt, eager }: { src?: string; alt?: string; eager?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} loading={eager ? "eager" : "lazy"} />
  ) : (
    <span className="t8-photo-fallback" aria-hidden="true">
      <IconCross size={56} />
    </span>
  );
}

/**
 * Clinic heroes, one per page kind:
 *  - home: headline + CTAs beside a photo with the appointment card
 *  - about: story beside a two-photo mosaic with a "find us" chip
 *  - contact: emergency / phone banner, contact details and an opening-hours card
 *  - extra pages: mint panel with breadcrumb and a side photo
 * Later heroes on a page render as a centred call-to-action card.
 */
export default function T8Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const ctx = useT8();
  const { photos, profile, pageKind, pageLabel, hours, baseUrl } = ctx;
  const { enabled, set } = useSectionEditor(section, sectionIndex);

  const headline = section.headline || profile.business_name;
  const subtext = section.subtext || profile.tagline || "";
  const ctaText = section.ctaText || "Book an appointment";
  const city = cityOf(profile.address);

  const title = (cls: string, as: "h1" | "h2" = "h1") => (
    <EditableText as={as} className={cls} value={headline} placeholder="Hero headline" multiline onCommit={(next) => set({ headline: next })} />
  );
  const lead =
    subtext || enabled ? (
      <EditableText as="p" className="t8-lead" value={subtext} placeholder="Hero subtext" multiline onCommit={(next) => set({ subtext: next })} />
    ) : null;
  const cta = (cls = "t8-btn") => (
    <a className={cls} href={section.ctaHref || bookHref(ctx)}>
      <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
      <IconArrow size={16} />
    </a>
  );
  const callBtn = profile.phone ? (
    <a className="t8-btn t8-btn-ghost" href={buildTelLink(profile.phone)}>
      <IconPhone size={16} /> Call {profile.phone}
    </a>
  ) : null;

  const variant = primary ? pageKind : "plain";

  if (variant === "about") {
    const a = photos[1] ?? photos[0];
    const b = photos[2] ?? (photos.length > 1 ? photos[0] : undefined);
    return (
      <section className="t8-hero t8-hero-about">
        <div className="t8-container t8-split">
          <div className="t8-split-text t8-reveal">
            <span className="t8-eyebrow">About us</span>
            {title("t8-h1")}
            {lead}
            <div className="t8-actions">
              {cta()}
              <Link className="t8-textlink" href={`${baseUrl}/contact`}>
                Visit us <IconArrow size={16} />
              </Link>
            </div>
          </div>
          <div className="t8-mosaic t8-reveal" data-count={b && b.url !== a?.url ? 2 : 1}>
            <div className="t8-mosaic-a">
              <Photo src={a?.url} alt={a?.alt} eager />
            </div>
            {b && b.url !== a?.url ? (
              <div className="t8-mosaic-b">
                <Photo src={b.url} alt={b.alt} />
              </div>
            ) : null}
            {profile.address ? (
              <a className="t8-float-chip" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                <span className="t8-float-ico">
                  <IconPin size={18} />
                </span>
                <span>
                  <small>Find us</small>
                  {city || profile.address}
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    return (
      <section className="t8-hero t8-hero-contact">
        <div className="t8-container">
          <div className="t8-alert t8-reveal" role="note">
            <span className="t8-alert-ico" aria-hidden="true">
              <IconAlert size={20} />
            </span>
            <p>
              <b>Medical emergency?</b> Call your local emergency number or go to the nearest emergency department.
            </p>
            {profile.phone ? (
              <a className="t8-alert-phone" href={buildTelLink(profile.phone)}>
                <IconPhone size={16} />
                <span>
                  <small>Clinic line</small>
                  {profile.phone}
                </span>
              </a>
            ) : null}
          </div>

          <div className="t8-contact-grid">
            <div className="t8-contact-text t8-reveal">
              <span className="t8-eyebrow">Contact</span>
              {title("t8-h1")}
              {lead}
              <ul className="t8-contact-list">
                {profile.phone ? (
                  <li>
                    <span className="t8-contact-ico"><IconPhone /></span>
                    <span>
                      <small>Phone</small>
                      <a href={buildTelLink(profile.phone)}>{profile.phone}</a>
                    </span>
                  </li>
                ) : null}
                {profile.whatsapp ? (
                  <li>
                    <span className="t8-contact-ico"><IconChat /></span>
                    <span>
                      <small>WhatsApp</small>
                      <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                        Message us
                      </a>
                    </span>
                  </li>
                ) : null}
                {profile.email ? (
                  <li>
                    <span className="t8-contact-ico"><IconMail /></span>
                    <span>
                      <small>Email</small>
                      <a href={buildEmailLink(profile.email)}>{profile.email}</a>
                    </span>
                  </li>
                ) : null}
                {profile.address ? (
                  <li>
                    <span className="t8-contact-ico"><IconPin /></span>
                    <span>
                      <small>Address</small>
                      {profile.address}
                      <a className="t8-textlink" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                        Get directions <IconArrow size={14} />
                      </a>
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>

            <aside className="t8-hours-card t8-reveal" aria-label="Opening hours">
              <div className="t8-hours-card-head">
                <span className="t8-contact-ico"><IconClock /></span>
                <h2 className="t8-h3">Opening hours</h2>
              </div>
              {hours.length || enabled ? (
                <T8Hours />
              ) : (
                <p className="t8-muted">Call or send a request and we&apos;ll let you know when we can see you.</p>
              )}
              <a className="t8-btn t8-btn-block" href={bookHref(ctx)}>
                Request an appointment <IconArrow size={16} />
              </a>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "extra") {
    const photo = photos[1] ?? photos[0];
    return (
      <section className="t8-hero t8-hero-page">
        <div className="t8-container">
          <div className="t8-page-panel t8-reveal" data-photo={!!photo}>
            <div className="t8-page-text">
              <nav className="t8-crumbs" aria-label="Breadcrumb">
                <Link href={`${baseUrl}/`}>Home</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{pageLabel || profile.business_name}</span>
              </nav>
              {title("t8-h1")}
              {lead}
              <div className="t8-actions">
                {cta()}
                {callBtn}
              </div>
            </div>
            {photo ? (
              <div className="t8-page-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt || ""} loading="eager" />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "plain") {
    return (
      <section className="t8-section t8-hero-plain">
        <div className="t8-container">
          <div className="t8-statement t8-reveal">
            {title("t8-h2", "h2")}
            {lead}
            <div className="t8-actions t8-actions-center">{cta()}</div>
          </div>
        </div>
      </section>
    );
  }

  const photo = photos[0];
  return (
    <section className="t8-hero t8-hero-home">
      <div className="t8-container t8-hero-grid">
        <div className="t8-hero-copy t8-reveal">
          <span className="t8-pill">
            <span className="t8-pill-dot" aria-hidden="true" />
            {city ? `${profile.business_name} · ${city}` : profile.business_name}
          </span>
          {title("t8-hero-title")}
          {lead}
          <div className="t8-actions">
            {cta()}
            {callBtn}
          </div>
        </div>

        <div className="t8-hero-visual" data-photo={!!photo}>
          <div className="t8-hero-photo t8-reveal">
            <Photo src={photo?.url} alt={photo?.alt} eager />
          </div>
          <AppointmentCard />
        </div>
      </div>
    </section>
  );
}
