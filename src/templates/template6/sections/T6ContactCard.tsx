"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT6 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

const INTERESTS = ["Buy", "Rent", "Sell", "Invest"];

/** "Book a private viewing": dark contact card + enquiry form (prefilled from the hero search). */
export default function T6ContactCard({ section }: { section: ContactCardSection }) {
  const { profile } = useT6();
  const formRef = useRef<HTMLFormElement>(null);

  // Prefill from ?interest=&location=&type=&budget= (set by the hero search).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const q = new URLSearchParams(window.location.search);
    const i = q.get("interest");
    if (i && INTERESTS.includes(i)) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="interest"][value="${i}"]`);
      if (radio) radio.checked = true;
    }
    const bits = [q.get("type"), q.get("location") && `in ${q.get("location")}`, q.get("budget") && `(${q.get("budget")})`]
      .filter(Boolean)
      .join(" ");
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (bits && message && !message.value) message.value = `I'm looking for: ${bits}.`;
  }, []);

  const inbox = useInboxForm();
  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  })();

  return (
    <section id="contact" className="t6-section">
      <div className="t6-container">
        <div className="t6-contact">
          <div className="t6-contact-card t6-reveal">
            <div style={{ position: "relative" }}>
              <span className="t6-kicker" style={{ color: "inherit", opacity: 0.8 }}>
                Contact
              </span>
              <h2 className="t6-h2" style={{ marginTop: 14 }}>
                Book a private viewing
              </h2>
              <p className="t6-lead" style={{ marginTop: 14 }}>
                Tell us what you are looking for and an agent who knows the area will get back to you.
              </p>
            </div>

            <div className="t6-contact-rows">
              {profile.phone ? (
                <a className="t6-contact-row" href={buildTelLink(profile.phone)}>
                  <span className="t6-contact-ico"><IconPhone /></span>
                  <span><small>Call us</small>{profile.phone}</span>
                </a>
              ) : null}
              {profile.whatsapp ? (
                <a className="t6-contact-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <span className="t6-contact-ico"><IconChat /></span>
                  <span><small>WhatsApp</small>Chat with an agent</span>
                </a>
              ) : null}
              {profile.email ? (
                <a className="t6-contact-row" href={buildEmailLink(profile.email)}>
                  <span className="t6-contact-ico"><IconMail /></span>
                  <span><small>Email</small>{profile.email}</span>
                </a>
              ) : null}
              {profile.address ? (
                <div className="t6-contact-row">
                  <span className="t6-contact-ico"><IconPin /></span>
                  <span><small>Office</small>{profile.address}</span>
                </div>
              ) : null}
            </div>

            {mapEmbedUrl ? (
              <div className="t6-map">
                <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t6-form t6-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t6-field">
                <span>I&apos;m interested in</span>
                <div className="t6-chips" role="radiogroup">
                  {INTERESTS.map((i) => (
                    <label key={i} className="t6-chip">
                      <input type="radio" name="interest" value={i} defaultChecked={i === INTERESTS[0]} />
                      <span>{i}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="t6-form-row">
                <label className="t6-field">
                  <span>Full name</span>
                  <input className="t6-input" name="name" placeholder="Your name" required />
                </label>
                <label className="t6-field">
                  <span>Phone</span>
                  <input className="t6-input" name="phone" type="tel" placeholder="+234…" required />
                </label>
              </div>
              <div className="t6-form-row">
                <label className="t6-field">
                  <span>Email</span>
                  <input className="t6-input" name="email" type="email" placeholder="you@email.com" />
                </label>
                <label className="t6-field">
                  <span>Preferred viewing date</span>
                  <input className="t6-input" name="date" type="date" />
                </label>
              </div>
              <label className="t6-field">
                <span>Message</span>
                <textarea
                  className="t6-input"
                  name="message"
                  rows={4}
                  placeholder="Location, budget, number of bedrooms…"
                />
              </label>
              <button type="submit" disabled={inbox.sending} className="t6-btn" style={{ width: "100%" }}>
                Request a viewing <IconArrow />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
