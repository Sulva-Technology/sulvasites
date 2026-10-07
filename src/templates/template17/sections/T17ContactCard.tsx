"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { firstName, useT17 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

/** "Write to me": contact lines beside a letter-style form (or a map when the form is off). */
export default function T17ContactCard({ section, anchor }: { section: ContactCardSection; sectionIndex?: number; anchor?: boolean }) {
  const { profile } = useT17();
  const inbox = useInboxForm();
  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(profile.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  })();

  const rows = [
    profile.email ? { key: "mail", icon: <IconMail />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false } : null,
    profile.phone ? { key: "call", icon: <IconPhone />, label: "Phone", value: profile.phone, href: buildTelLink(profile.phone), ext: false } : null,
    profile.whatsapp ? { key: "wa", icon: <IconChat />, label: "WhatsApp", value: "Send a message", href: buildWhatsAppLink(profile.whatsapp), ext: true } : null,
    profile.address ? { key: "pin", icon: <IconPin />, label: "Based in", value: profile.address, href: null, ext: false } : null,
  ].filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <section id={anchor ? "contact" : undefined} className="t17-section">
      <div className="t17-container t17-contact">
        <div className="t17-contact-info t17-reveal">
          <p className="t17-kicker">Correspondence</p>
          <h2 className="t17-h2">Write to {firstName(profile.business_name)}.</h2>
          <p className="t17-lead">Questions, pitches, collaborations or simply a hello. Every message is read.</p>
          <ul className="t17-lines">
            {rows.map((r) => (
              <li key={r.key}>
                <span className="t17-line-ico">{r.icon}</span>
                <span>
                  <small>{r.label}</small>
                  {r.href ? (
                    <a href={r.href} {...(r.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {r.value}
                    </a>
                  ) : (
                    r.value
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {section.showForm ? (
          <form className="t17-letter t17-reveal" onSubmit={inbox.onSubmit}>
            <InboxHoneypot />
            <div className="t17-letter-row">
              <label className="t17-field">
                <span>Your name</span>
                <input name="name" autoComplete="name" required />
              </label>
              <label className="t17-field">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
            </div>
            <label className="t17-field">
              <span>Subject</span>
              <select name="subject" defaultValue="">
                <option value="">Just saying hello</option>
                <option value="Collaboration">Collaboration or commission</option>
                <option value="Speaking">Speaking or interview</option>
                <option value="Feedback">Feedback on a post</option>
              </select>
            </label>
            <label className="t17-field">
              <span>Message</span>
              <textarea name="message" rows={5} required />
            </label>
            <button type="submit" className="t17-btn t17-btn-solid" disabled={inbox.sending}>
              Send letter <IconArrow size={16} />
            </button>
            <InboxStatus state={inbox.state} />
          </form>
        ) : mapEmbedUrl ? (
          <div className="t17-map t17-reveal">
            <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
