"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T8Hours from "../components/T8Hours";
import { directionsHref, useT8 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

const PATIENT = ["New patient", "Returning patient"];
const TIMES = ["Morning", "Afternoon", "Evening"];

/**
 * "Book a visit": deep teal details card (contact, hours) beside an appointment request form.
 * `?service=` (from the hero appointment card and service links) preselects the reason for
 * the visit, or prefills the message when the site lists no services.
 */
export default function T8ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, hours, pageKind, serviceNames } = useT8();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const service = new URLSearchParams(window.location.search).get("service")?.trim();
    const form = formRef.current;
    if (!service || !form) return;
    const select = form.elements.namedItem("service") as HTMLSelectElement | null;
    if (select) {
      if (![...select.options].some((o) => o.value === service)) select.add(new Option(service, service), 0);
      select.value = service;
      return;
    }
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (message && !message.value) message.value = `I'd like to book: ${service}.`;
  }, []);

  const inbox = useInboxForm();
  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  })();
  const mapHref =
    section.mapLink?.trim() && !section.mapLink.includes("output=embed")
      ? section.mapLink.trim()
      : profile.address
        ? directionsHref(profile.address)
        : null;

  return (
    <section id="book" className="t8-section t8-book-section">
      <div className="t8-container">
        <div className="t8-book" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t8-book-card t8-reveal">
            <span className="t8-eyebrow t8-eyebrow-light">Appointments</span>
            <h2 className="t8-h2">Book a visit</h2>
            <p className="t8-book-lead">
              {section.showForm
                ? "Tell us why you'd like to come in and when suits you. For anything urgent, please call."
                : "Call, message or email us to arrange an appointment."}
            </p>

            <div className="t8-book-rows">
              {profile.phone ? (
                <a className="t8-book-row" href={buildTelLink(profile.phone)}>
                  <span className="t8-book-ico"><IconPhone /></span>
                  <span><small>Call</small>{profile.phone}</span>
                </a>
              ) : null}
              {profile.whatsapp ? (
                <a className="t8-book-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <span className="t8-book-ico"><IconChat /></span>
                  <span><small>WhatsApp</small>Message us</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t8-book-row" href={buildEmailLink(profile.email)}>
                  <span className="t8-book-ico"><IconMail /></span>
                  <span><small>Email</small>{profile.email}</span>
                </a>
              ) : null}
              {profile.address ? (
                mapHref ? (
                  <a className="t8-book-row" href={mapHref} target="_blank" rel="noreferrer">
                    <span className="t8-book-ico"><IconPin /></span>
                    <span><small>Address</small>{profile.address}</span>
                  </a>
                ) : (
                  <div className="t8-book-row">
                    <span className="t8-book-ico"><IconPin /></span>
                    <span><small>Address</small>{profile.address}</span>
                  </div>
                )
              ) : null}
            </div>

            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t8-book-hours">
                <small>Opening hours</small>
                <T8Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t8-form t8-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t8-form-title">
                <h3 className="t8-h3">Appointment request</h3>
                <small>Fields marked * are required</small>
              </div>

              {serviceNames.length ? (
                <label className="t8-field">
                  <span>Reason for visit</span>
                  <select className="t8-input" name="service" defaultValue="">
                    <option value="" disabled>
                      Choose a service
                    </option>
                    {serviceNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Not sure">Not sure — please advise</option>
                  </select>
                </label>
              ) : null}

              <fieldset className="t8-field t8-fieldset">
                <legend>I am a</legend>
                <div className="t8-chips">
                  {PATIENT.map((p, i) => (
                    <label key={p} className="t8-chip-opt">
                      <input type="radio" name="patient" value={p} defaultChecked={i === 0} />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="t8-form-row">
                <label className="t8-field">
                  <span>Preferred date</span>
                  <input className="t8-input" name="date" type="date" />
                </label>
                <fieldset className="t8-field t8-fieldset">
                  <legend>Time of day</legend>
                  <div className="t8-chips">
                    {TIMES.map((t, i) => (
                      <label key={t} className="t8-chip-opt">
                        <input type="radio" name="time" value={t} defaultChecked={i === 0} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="t8-form-row">
                <label className="t8-field">
                  <span>Full name *</span>
                  <input className="t8-input" name="name" autoComplete="name" required />
                </label>
                <label className="t8-field">
                  <span>Phone *</span>
                  <input className="t8-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t8-field">
                <span>Email</span>
                <input className="t8-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t8-field">
                <span>Message</span>
                <textarea className="t8-input" name="message" rows={3} placeholder="Anything we should know before your visit?" />
              </label>
              <button type="submit" disabled={inbox.sending} className="t8-btn t8-btn-block">
                Request appointment <IconArrow size={16} />
              </button>
              <p className="t8-fineprint">Please don&apos;t include detailed medical information in this form.</p>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t8-map t8-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
