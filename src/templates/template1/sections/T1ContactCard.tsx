"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT1 } from "../ctx";
import { IconArrow } from "../icons";

/** Office details + map on a grey side panel; consultation request form on the right. */
export default function T1ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, serviceNames } = useT1();

  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  })();

  return (
    <section id="contact" className="t1-section">
      <div className="t1-container">
        <div className="t1-head t1-reveal">
          <div>
            <span className="t1-over">Contact</span>
            <h2 className="t1-h2">
              Book a <em>consultation</em>
            </h2>
          </div>
          <p className="t1-lead">Tell us about your organisation and what you&apos;d like to achieve. We respond within one business day.</p>
        </div>

        <div className="t1-contact t1-reveal">
          <div className="t1-contact-side">
            <div className="t1-contact-rows">
              {profile.phone ? (
                <a className="t1-contact-row" href={buildTelLink(profile.phone)}>
                  <span className="t1-mono t1-muted">Phone</span>
                  <span>{profile.phone}</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t1-contact-row" href={buildEmailLink(profile.email)}>
                  <span className="t1-mono t1-muted">Email</span>
                  <span>{profile.email}</span>
                </a>
              ) : null}
              {profile.whatsapp ? (
                <a className="t1-contact-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <span className="t1-mono t1-muted">WhatsApp</span>
                  <span>Message us</span>
                </a>
              ) : null}
              {profile.address ? (
                <div className="t1-contact-row">
                  <span className="t1-mono t1-muted">Office</span>
                  <span>{profile.address}</span>
                </div>
              ) : null}
            </div>
            {mapEmbedUrl ? (
              <div className="t1-map">
                <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              className="t1-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Form submission is not configured yet. Please call or email us directly.");
              }}
            >
              <div className="t1-form-row">
                <label className="t1-field">
                  <span>Full name</span>
                  <input className="t1-input" name="name" required />
                </label>
                <label className="t1-field">
                  <span>Organisation</span>
                  <input className="t1-input" name="company" />
                </label>
              </div>
              <div className="t1-form-row">
                <label className="t1-field">
                  <span>Email</span>
                  <input className="t1-input" name="email" type="email" required />
                </label>
                <label className="t1-field">
                  <span>Phone</span>
                  <input className="t1-input" name="phone" type="tel" />
                </label>
              </div>
              {serviceNames.length ? (
                <label className="t1-field">
                  <span>Service of interest</span>
                  <select className="t1-input" name="service" defaultValue="">
                    <option value="">Select a service</option>
                    {serviceNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </label>
              ) : null}
              <label className="t1-field">
                <span>How can we help?</span>
                <textarea className="t1-input" name="message" rows={5} required />
              </label>
              <label className="t1-consent">
                <input type="checkbox" name="consent" required />
                <span>I agree to be contacted about my enquiry.</span>
              </label>
              <div>
                <button type="submit" className="t1-btn">
                  Send request <IconArrow />
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
