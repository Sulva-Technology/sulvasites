"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T13Hours from "../components/T13Hours";
import { directionsHref, useT13 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

/** "Get in touch": contact lines and opening hours beside a message form (or a map when the form is off). */
export default function T13ContactCard({
  section,
  anchor,
}: {
  section: ContactCardSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { profile, hours, pageKind } = useT13();

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

  const rows = (
    <div className="t13-rows">
      {profile.phone ? (
        <a className="t13-row" href={buildTelLink(profile.phone)}>
          <span className="t13-row-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t13-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t13-row-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t13-row" href={buildEmailLink(profile.email)}>
          <span className="t13-row-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t13-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t13-row-ico"><IconPin /></span>
            <span><small>Visit</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t13-row">
            <span className="t13-row-ico"><IconPin /></span>
            <span><small>Visit</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id={anchor ? "contact" : undefined} className="t13-section t13-contact-section">
      <div className="t13-container">
        <div className="t13-contactcard" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t13-contact-info t13-reveal">
            <p className="t13-label">{section.showForm ? "Message us" : "Contact"}</p>
            <h2 className="t13-h2">{section.showForm ? "Get in touch" : "Talk to the studio"}</h2>
            <p className="t13-contact-lead">
              {section.showForm
                ? "Ask about sizing, an order or a piece you love. We will reply as soon as we can."
                : "Call, message or email us. We are happy to help with sizing and orders."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t13-contact-hours">
                <small>Opening hours</small>
                <T13Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              className="t13-form t13-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t13-form-row">
                <label className="t13-field">
                  <span>Your name *</span>
                  <input className="t13-input" name="name" autoComplete="name" required />
                </label>
                <label className="t13-field">
                  <span>Phone *</span>
                  <input className="t13-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t13-field">
                <span>Email</span>
                <input className="t13-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t13-field">
                <span>Message</span>
                <textarea className="t13-input" name="message" rows={4} placeholder="How can we help?" />
              </label>
              <button type="submit" disabled={inbox.sending} className="t13-btn t13-btn-block t13-btn-lg">
                Send message <IconArrow size={18} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t13-map t13-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
