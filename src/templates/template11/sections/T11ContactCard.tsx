"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T11Hours from "../components/T11Hours";
import { directionsHref, useT11 } from "../ctx";
import { Confetti, IconArrow, IconChat, IconMail, IconPhone, IconPin, Mesh } from "../icons";

/**
 * "Let's plan your event": a plum invitation card with contact rows and opening hours beside an
 * enquiry form (or a map when the form is off). `?service=` preselects the package / event type
 * (or prefills the message when the site lists no packages).
 */
export default function T11ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, hours, pageKind, packages } = useT11();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const service = new URLSearchParams(window.location.search).get("service")?.trim();
    const form = formRef.current;
    if (!form || !service) return;
    const select = form.elements.namedItem("service") as HTMLSelectElement | null;
    if (select) {
      if (![...select.options].some((o) => o.value === service)) select.add(new Option(service, service), 1);
      select.value = service;
      return;
    }
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (message && !message.value) message.value = `I'm interested in: ${service}.`;
  }, []);

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

  const rows = (
    <div className="t11-plan-rows">
      {profile.phone ? (
        <a className="t11-plan-row" href={buildTelLink(profile.phone)}>
          <span className="t11-plan-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t11-plan-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t11-plan-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t11-plan-row" href={buildEmailLink(profile.email)}>
          <span className="t11-plan-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t11-plan-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t11-plan-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t11-plan-row">
            <span className="t11-plan-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id="plan" className="t11-section t11-plan-section">
      <div className="t11-container">
        <div className="t11-plan" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t11-plan-info t11-reveal">
            <Mesh className="t11-mesh-plan" />
            <Confetti set="card" />
            <span className="t11-kicker t11-kicker-light">{section.showForm ? "Enquiries" : "Visit"}</span>
            <h2 className="t11-h2">
              {section.showForm ? (
                <>
                  Let&apos;s plan your <span className="t11-hl-light">event</span>
                </>
              ) : (
                <>
                  Come and <span className="t11-hl-light">say hello</span>
                </>
              )}
            </h2>
            <p className="t11-plan-lead">
              {section.showForm
                ? "Share the occasion, a date and a rough guest count. Prefer to talk? Call or message us."
                : "Call, message or drop by — we'd love to hear about your celebration."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t11-plan-hours">
                <small>Opening hours</small>
                <T11Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t11-form t11-reveal"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Online enquiries are not set up yet. Please call, WhatsApp or email us to plan your event.");
              }}
            >
              <div className="t11-form-title">
                <h3>Event enquiry</h3>
                <small>* required</small>
              </div>

              {packages.length ? (
                <label className="t11-field">
                  <span>Package / event type</span>
                  <select className="t11-input" name="service" defaultValue="">
                    <option value="">Choose a package</option>
                    {packages.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Something else">Something else — let&apos;s talk</option>
                  </select>
                </label>
              ) : null}

              <div className="t11-form-row">
                <label className="t11-field">
                  <span>Event date</span>
                  <input className="t11-input" name="date" type="date" />
                </label>
                <label className="t11-field">
                  <span>Guests (approx.)</span>
                  <input className="t11-input" name="guests" type="number" min={1} inputMode="numeric" />
                </label>
              </div>
              <div className="t11-form-row">
                <label className="t11-field">
                  <span>Your name *</span>
                  <input className="t11-input" name="name" autoComplete="name" required />
                </label>
                <label className="t11-field">
                  <span>Phone *</span>
                  <input className="t11-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t11-field">
                <span>Email</span>
                <input className="t11-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t11-field">
                <span>Tell us about it</span>
                <textarea className="t11-input" name="message" rows={3} placeholder="The occasion, the venue (if you have one), the vibe…" />
              </label>
              <button type="submit" className="t11-btn t11-btn-block t11-btn-lg">
                Send enquiry <IconArrow size={18} />
              </button>
            </form>
          ) : mapEmbedUrl ? (
            <div className="t11-map t11-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
