"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, hoursOf, useT15 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

/**
 * "Make an enquiry": a glass panel with contact rows and showroom hours beside the enquiry form
 * (or a map when the form is off). `?vehicle=` (from a collection card) preselects the car.
 */
export default function T15ContactCard({
  section,
  anchor,
}: {
  section: ContactCardSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { profile, pageKind, vehicles } = useT15();
  const formRef = useRef<HTMLFormElement>(null);
  const hours = hoursOf(profile);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const vehicle = new URLSearchParams(window.location.search).get("vehicle")?.trim();
    if (!vehicle) return;
    const select = form.elements.namedItem("vehicle") as HTMLSelectElement | null;
    if (select) {
      if (![...select.options].some((o) => o.value === vehicle)) select.add(new Option(vehicle, vehicle), 1);
      select.value = vehicle;
      return;
    }
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (message && !message.value) message.value = `I'm interested in: ${vehicle}.`;
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
    <section id={anchor ? "enquire" : undefined} className="t15-section t15-enquire-section">
      <div className="t15-container">
        <div className="t15-enquire" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t15-enquire-info t15-glass t15-reveal">
            <p className="t15-eyebrow">{section.showForm ? "Enquiries" : "Visit"}</p>
            <h2 className="t15-h2">{section.showForm ? "Make an enquiry" : "Come and see them in person"}</h2>
            <p className="t15-muted">
              {section.showForm
                ? "Ask about a car, book a viewing or a test drive, or tell us what you're looking for."
                : "Call, message or email to book a private viewing."}
            </p>
            <div className="t15-rows">
              {profile.phone ? (
                <a className="t15-row" href={buildTelLink(profile.phone)}>
                  <span className="t15-row-ico"><IconPhone /></span>
                  <span><small>Call</small>{profile.phone}</span>
                </a>
              ) : null}
              {profile.whatsapp ? (
                <a className="t15-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <span className="t15-row-ico"><IconChat /></span>
                  <span><small>WhatsApp</small>Message us</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t15-row" href={buildEmailLink(profile.email)}>
                  <span className="t15-row-ico"><IconMail /></span>
                  <span><small>Email</small>{profile.email}</span>
                </a>
              ) : null}
              {profile.address ? (
                mapHref ? (
                  <a className="t15-row" href={mapHref} target="_blank" rel="noreferrer">
                    <span className="t15-row-ico"><IconPin /></span>
                    <span><small>Showroom</small>{profile.address}</span>
                  </a>
                ) : (
                  <div className="t15-row">
                    <span className="t15-row-ico"><IconPin /></span>
                    <span><small>Showroom</small>{profile.address}</span>
                  </div>
                )
              ) : null}
            </div>
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t15-enquire-hours">
                <small>Showroom hours</small>
                <ul>
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form ref={formRef} className="t15-form t15-glass t15-reveal" onSubmit={inbox.onSubmit}>
              <InboxHoneypot />
              {vehicles.length ? (
                <label className="t15-field">
                  <span>Car you&apos;re interested in</span>
                  <select className="t15-input" name="vehicle" defaultValue="">
                    <option value="">Not sure yet / something else</option>
                    {vehicles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="t15-form-row">
                <label className="t15-field">
                  <span>Your name *</span>
                  <input className="t15-input" name="name" autoComplete="name" required />
                </label>
                <label className="t15-field">
                  <span>Phone *</span>
                  <input className="t15-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t15-field">
                <span>Email</span>
                <input className="t15-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t15-field">
                <span>Message</span>
                <textarea
                  className="t15-input"
                  name="message"
                  rows={4}
                  placeholder="A viewing, a test drive, a part-exchange, or the car you're searching for…"
                />
              </label>
              <button type="submit" disabled={inbox.sending} className="t15-btn t15-btn-solid t15-btn-lg t15-btn-block">
                Send enquiry <IconArrow size={18} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t15-map t15-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
