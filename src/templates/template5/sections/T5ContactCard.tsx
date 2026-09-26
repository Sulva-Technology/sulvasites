"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT5 } from "../ctx";

const TIMES = ["Morning", "Afternoon", "Evening"];

/** "Book your appointment": dark info panel + booking request form (service list from the site). */
export default function T5ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, serviceNames } = useT5();
  const formRef = useRef<HTMLFormElement>(null);
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const instagram = typeof socials.instagram === "string" ? socials.instagram : "";

  // Preselect ?service= (set by "Book" links on service/package cards).
  useEffect(() => {
    const service = new URLSearchParams(window.location.search).get("service");
    const select = formRef.current?.elements.namedItem("service") as HTMLSelectElement | null;
    if (!service || !select) return;
    if (![...select.options].some((o) => o.value === service)) select.add(new Option(service, service));
    select.value = service;
  }, []);

  return (
    <section id="book" className="t5-section">
      <div className="t5-container">
        <div className="t5-booking t5-reveal" id="contact">
          <div className="t5-booking-side">
            <span className="t5-eyebrow">Reservations</span>
            <h2 className="t5-title">
              Book your <em style={{ color: "inherit" }}>appointment</em>
            </h2>
            <p className="t5-lead">Send a request and we&apos;ll confirm your time within a few hours.</p>
            <div className="t5-contact-list">
              {profile.whatsapp ? (
                <a className="t5-contact-item" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <small>WhatsApp</small>
                  <span>Message us</span>
                </a>
              ) : null}
              {profile.phone ? (
                <a className="t5-contact-item" href={buildTelLink(profile.phone)}>
                  <small>Call</small>
                  <span>{profile.phone}</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t5-contact-item" href={buildEmailLink(profile.email)}>
                  <small>Email</small>
                  <span>{profile.email}</span>
                </a>
              ) : null}
              {instagram ? (
                <a className="t5-contact-item" href={instagram} target="_blank" rel="noreferrer">
                  <small>Instagram</small>
                  <span>Follow our work</span>
                </a>
              ) : null}
              {profile.address ? (
                <div className="t5-contact-item">
                  <small>Studio</small>
                  <span>{profile.address}</span>
                </div>
              ) : null}
              {section.mapLink ? (
                <a className="t5-contact-item" href={section.mapLink} target="_blank" rel="noreferrer">
                  <small>Directions</small>
                  <span>Open in Maps ↗</span>
                </a>
              ) : null}
            </div>
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t5-booking-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Online booking is not configured yet. Please WhatsApp, call or email us to confirm your appointment.");
              }}
            >
              <label className="t5-field">
                <span>Service</span>
                <select className="t5-input" name="service" defaultValue="">
                  <option value="" disabled>
                    Choose a service
                  </option>
                  {serviceNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Not sure yet">Not sure yet — advise me</option>
                </select>
              </label>
              <div className="t5-form-row">
                <label className="t5-field">
                  <span>Preferred date</span>
                  <input className="t5-input" name="date" type="date" required />
                </label>
                <div className="t5-field">
                  <span>Time of day</span>
                  <div className="t5-times" role="radiogroup">
                    {TIMES.map((t, i) => (
                      <label key={t} className="t5-time">
                        <input type="radio" name="time" value={t} defaultChecked={i === 0} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="t5-form-row">
                <label className="t5-field">
                  <span>Name</span>
                  <input className="t5-input" name="name" placeholder="Your name" required />
                </label>
                <label className="t5-field">
                  <span>Phone</span>
                  <input className="t5-input" name="phone" type="tel" placeholder="Best number to reach you" required />
                </label>
              </div>
              <label className="t5-field">
                <span>Notes</span>
                <textarea className="t5-input" name="notes" rows={3} placeholder="Occasion, location, inspiration…" />
              </label>
              <button type="submit" className="t5-btn t5-btn-rose">
                Request booking
              </button>
              <p className="t5-fineprint">Your appointment is confirmed once we reply. A booking fee may apply.</p>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
