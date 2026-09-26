"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT2 } from "../ctx";

/** "Say hello": big email + details on the left, boxed form with hard shadow on the right. */
export default function T2ContactCard({ section }: { section: ContactCardSection }) {
  const { profile } = useT2();

  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  })();

  return (
    <section id="contact" className="t2-section t2-section-rule">
      <div className="t2-container t2-contact">
        <div className="t2-contact-intro t2-reveal">
          <span className="t2-kicker">Contact</span>
          <h2 className="t2-display" style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}>
            Say <em>hello.</em>
          </h2>
          {profile.email ? (
            <a className="t2-mail" href={buildEmailLink(profile.email)}>
              {profile.email}
            </a>
          ) : null}
          <div className="t2-details">
            {profile.phone ? (
              <a className="t2-detail" href={buildTelLink(profile.phone)}>
                <span className="t2-meta">Phone</span>
                <span>{profile.phone}</span>
              </a>
            ) : null}
            {profile.whatsapp ? (
              <a className="t2-detail" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                <span className="t2-meta">WhatsApp</span>
                <span>Message us</span>
              </a>
            ) : null}
            {profile.address ? (
              <div className="t2-detail">
                <span className="t2-meta">Studio</span>
                <span>{profile.address}</span>
              </div>
            ) : null}
          </div>
          {mapEmbedUrl ? (
            <div className="t2-map">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>

        {section.showForm ? (
          <form
            className="t2-form t2-reveal"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Form submission is not configured yet. Please email us directly.");
            }}
          >
            <span className="t2-kicker">Pitch us</span>
            <div className="t2-form-row">
              <label className="t2-field">
                <span>Name</span>
                <input className="t2-input" name="name" required />
              </label>
              <label className="t2-field">
                <span>Email</span>
                <input className="t2-input" name="email" type="email" required />
              </label>
            </div>
            <label className="t2-field">
              <span>Subject</span>
              <input className="t2-input" name="subject" placeholder="New project, collaboration, press…" />
            </label>
            <label className="t2-field">
              <span>Message</span>
              <textarea className="t2-input" name="message" rows={6} required />
            </label>
            <div>
              <button type="submit" className="t2-btn">
                Send it
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
