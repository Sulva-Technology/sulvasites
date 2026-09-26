"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT4 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

export default function T4ContactCard({ section }: { section: ContactCardSection }) {
  const { profile } = useT4();

  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    return null;
  })();

  return (
    <section id="contact" className="t4-section">
      <div className="t4-container">
        <div className="t4-head t4-reveal">
          <span className="t4-label">Contact</span>
          <h2 className="t4-h2" style={{ marginTop: 12 }}>
            Let&apos;s get you <span className="t4-mark">started</span>
          </h2>
          <p className="t4-lead" style={{ marginTop: 14 }}>
            Questions, demos or partnerships — send a message and a real person will reply.
          </p>
        </div>

        <div className="t4-contact">
          <div className="t4-contact-info t4-reveal">
            {profile.email ? (
              <a className="t4-method" href={buildEmailLink(profile.email)}>
                <i><IconMail /></i>
                <span><small>Email</small><b>{profile.email}</b></span>
              </a>
            ) : null}
            {profile.whatsapp ? (
              <a className="t4-method" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                <i><IconChat /></i>
                <span><small>WhatsApp</small><b>Chat with us</b></span>
              </a>
            ) : null}
            {profile.phone ? (
              <a className="t4-method" href={buildTelLink(profile.phone)}>
                <i><IconPhone /></i>
                <span><small>Phone</small><b>{profile.phone}</b></span>
              </a>
            ) : null}
            {profile.address ? (
              <div className="t4-method">
                <i><IconPin /></i>
                <span><small>Office</small><b>{profile.address}</b></span>
              </div>
            ) : null}
            {mapEmbedUrl ? (
              <div className="t4-map">
                <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              className="t4-form t4-reveal"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Form submission is not configured yet. Please email us directly.");
              }}
            >
              <div className="t4-form-row">
                <label className="t4-field">
                  <span>Name</span>
                  <input className="t4-input" name="name" placeholder="Jane Doe" required />
                </label>
                <label className="t4-field">
                  <span>Work email</span>
                  <input className="t4-input" name="email" type="email" placeholder="jane@company.com" required />
                </label>
              </div>
              <label className="t4-field">
                <span>Company (optional)</span>
                <input className="t4-input" name="company" placeholder="Company name" />
              </label>
              <label className="t4-field">
                <span>How can we help?</span>
                <textarea className="t4-input" name="message" rows={5} placeholder="Tell us a little about what you need…" required />
              </label>
              <button type="submit" className="t4-btn t4-btn-accent">
                Send message <IconArrow />
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
