"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T14Hours from "../components/T14Hours";
import { directionsHref, useT14 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

/** "Get in touch": contact lines and opening hours beside a message form (or a map when the form is off). */
export default function T14ContactCard({
  section,
  anchor,
}: {
  section: ContactCardSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { profile, hours, pageKind } = useT14();

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
    <div className="t14-rows">
      {profile.phone ? (
        <a className="t14-row" href={buildTelLink(profile.phone)}>
          <span className="t14-row-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t14-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t14-row-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t14-row" href={buildEmailLink(profile.email)}>
          <span className="t14-row-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t14-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t14-row-ico"><IconPin /></span>
            <span><small>Visit</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t14-row">
            <span className="t14-row-ico"><IconPin /></span>
            <span><small>Visit</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id={anchor ? "contact" : undefined} className="t14-section t14-contact-section">
      <div className="t14-container">
        <div className="t14-contactcard" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t14-contact-info t14-reveal">
            <p className="t14-label">{section.showForm ? "Message us" : "Contact"}</p>
            <h2 className="t14-h2">{section.showForm ? "Get in touch" : "Talk to the studio"}</h2>
            <p className="t14-contact-lead">
              {section.showForm
                ? "Ask about a product, an order or delivery. We will reply as soon as we can."
                : "Call, message or email us. We are happy to help with sizing and orders."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t14-contact-hours">
                <small>Opening hours</small>
                <T14Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              className="t14-form t14-reveal"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Online messages are not set up yet. Please call, WhatsApp or email us.");
              }}
            >
              <div className="t14-form-row">
                <label className="t14-field">
                  <span>Your name *</span>
                  <input className="t14-input" name="name" autoComplete="name" required />
                </label>
                <label className="t14-field">
                  <span>Phone *</span>
                  <input className="t14-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t14-field">
                <span>Email</span>
                <input className="t14-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t14-field">
                <span>Message</span>
                <textarea className="t14-input" name="message" rows={4} placeholder="How can we help?" />
              </label>
              <button type="submit" className="t14-btn t14-btn-block t14-btn-lg">
                Send message <IconArrow size={18} />
              </button>
            </form>
          ) : mapEmbedUrl ? (
            <div className="t14-map t14-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
