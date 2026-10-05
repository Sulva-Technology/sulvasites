"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T7Hours from "../components/T7Hours";
import { directionsHref, useT7 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin, Ornament } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

const GUESTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9+"];
const OCCASIONS = ["Just dinner", "Birthday", "Anniversary", "Business", "Private dining", "Other"];

/** "Book a table": dark details card (contact, hours, map) beside a reservation request form. */
export default function T7ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, hours, pageKind } = useT7();
  const formRef = useRef<HTMLFormElement>(null);

  // Preselect ?occasion= (set by "Enquire" links on private dining / events cards); ?service= works too, occasion wins.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const occasion = params.get("occasion")?.trim() || params.get("service")?.trim();
    const select = formRef.current?.elements.namedItem("occasion") as HTMLSelectElement | null;
    if (!occasion || !select) return;
    if (![...select.options].some((o) => o.value === occasion)) select.add(new Option(occasion, occasion));
    select.value = occasion;
  }, []);

  const inbox = useInboxForm();
  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  })();
  const mapHref = section.mapLink?.trim() && !section.mapLink.includes("output=embed")
    ? section.mapLink.trim()
    : profile.address
      ? directionsHref(profile.address)
      : null;

  return (
    <section id="reserve" className="t7-section t7-reserve-section">
      <div className="t7-container">
        <div className="t7-reserve" data-form={section.showForm}>
          <div className="t7-reserve-card t7-reveal">
            <span className="t7-eyebrow t7-eyebrow-light">
              <Ornament /> Reservations
            </span>
            <h2 className="t7-h2">Book a table</h2>
            <p className="t7-reserve-lead">
              {section.showForm
                ? "Tell us when you'd like to come and how many you'll be. Send a request and we'll get back to you."
                : "Get in touch to book a table or ask about larger groups."}
            </p>

            <div className="t7-reserve-rows">
              {profile.phone ? (
                <a className="t7-reserve-row" href={buildTelLink(profile.phone)}>
                  <span className="t7-reserve-ico"><IconPhone /></span>
                  <span><small>Call</small>{profile.phone}</span>
                </a>
              ) : null}
              {profile.whatsapp ? (
                <a className="t7-reserve-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <span className="t7-reserve-ico"><IconChat /></span>
                  <span><small>WhatsApp</small>Message us</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t7-reserve-row" href={buildEmailLink(profile.email)}>
                  <span className="t7-reserve-ico"><IconMail /></span>
                  <span><small>Email</small>{profile.email}</span>
                </a>
              ) : null}
              {profile.address ? (
                mapHref ? (
                  <a className="t7-reserve-row" href={mapHref} target="_blank" rel="noreferrer">
                    <span className="t7-reserve-ico"><IconPin /></span>
                    <span><small>Find us</small>{profile.address}</span>
                  </a>
                ) : (
                  <div className="t7-reserve-row">
                    <span className="t7-reserve-ico"><IconPin /></span>
                    <span><small>Find us</small>{profile.address}</span>
                  </div>
                )
              ) : null}
            </div>

            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t7-reserve-hours">
                <small>Opening hours</small>
                <T7Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t7-form t7-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t7-form-title">
                <span className="t7-h3">Reservation request</span>
                <small>All fields marked * are required</small>
              </div>
              <div className="t7-form-row t7-form-row-3">
                <label className="t7-field">
                  <span>Date *</span>
                  <input className="t7-input" name="date" type="date" required />
                </label>
                <label className="t7-field">
                  <span>Time *</span>
                  <input className="t7-input" name="time" type="time" step={900} defaultValue="19:00" required />
                </label>
                <label className="t7-field">
                  <span>Guests *</span>
                  <select className="t7-input" name="guests" defaultValue="2" required>
                    {GUESTS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="t7-form-row">
                <label className="t7-field">
                  <span>Name *</span>
                  <input className="t7-input" name="name" autoComplete="name" required />
                </label>
                <label className="t7-field">
                  <span>Phone *</span>
                  <input className="t7-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <div className="t7-form-row">
                <label className="t7-field">
                  <span>Email</span>
                  <input className="t7-input" name="email" type="email" autoComplete="email" />
                </label>
                <label className="t7-field">
                  <span>Occasion</span>
                  <select className="t7-input" name="occasion" defaultValue={OCCASIONS[0]}>
                    {OCCASIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="t7-field">
                <span>Notes</span>
                <textarea className="t7-input" name="message" rows={3} placeholder="Allergies, high chair, seating preference…" />
              </label>
              <button type="submit" disabled={inbox.sending} className="t7-btn t7-btn-block">
                Request a table <IconArrow size={16} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t7-map t7-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>

        {section.showForm && mapEmbedUrl ? (
          <div className="t7-map t7-map-wide t7-reveal">
            <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
