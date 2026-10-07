"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, hoursOf, useT16 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

/**
 * "Let's connect": icon rows (and meeting times) beside a rounded join form, or a map when the
 * form is off. `?circle=` (from a community card) preselects the circle.
 */
export default function T16ContactCard({
  section,
  anchor,
}: {
  section: ContactCardSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { profile, pageKind, circles } = useT16();
  const formRef = useRef<HTMLFormElement>(null);
  const hours = hoursOf(profile);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const circle = new URLSearchParams(window.location.search).get("circle")?.trim();
    if (!circle) return;
    const select = form.elements.namedItem("circle") as HTMLSelectElement | null;
    if (select) {
      if (![...select.options].some((o) => o.value === circle)) select.add(new Option(circle, circle), 1);
      select.value = circle;
      return;
    }
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (message && !message.value) message.value = `I'd like to join: ${circle}.`;
  }, []);

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

  const rows = [
    profile.email ? { key: "mail", icon: <IconMail size={22} />, label: "Email", value: profile.email, href: buildEmailLink(profile.email), ext: false } : null,
    profile.phone ? { key: "call", icon: <IconPhone size={22} />, label: "Phone", value: profile.phone, href: buildTelLink(profile.phone), ext: false } : null,
    profile.whatsapp
      ? { key: "wa", icon: <IconChat size={22} />, label: "WhatsApp", value: "Message us", href: buildWhatsAppLink(profile.whatsapp), ext: true }
      : null,
    profile.address ? { key: "visit", icon: <IconPin size={22} />, label: "Location", value: profile.address, href: mapHref, ext: true } : null,
  ].filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <section id={anchor ? "join" : undefined} className="t16-section t16-tinted">
      <div className="t16-container">
        <div className="t16-connect" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t16-connect-info t16-reveal">
            <p className="t16-kicker">{section.showForm ? "Join us" : "Visit"}</p>
            <h2 className="t16-h2">{section.showForm ? "Let's connect." : "Come as you are."}</h2>
            <p className="t16-lead">
              {section.showForm
                ? "Whether you want to join, partner with us or you're simply curious — we'd love to hear from you."
                : "Call, message or email us, or just come along — there's always a seat for you."}
            </p>
            <div className="t16-rows">
              {rows.map((r) =>
                r.href ? (
                  <a key={r.key} className="t16-row" href={r.href} {...(r.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                    <span className="t16-ico-tile t16-ico-lg">{r.icon}</span>
                    <span>
                      <small>{r.label}</small>
                      {r.value}
                    </span>
                  </a>
                ) : (
                  <div key={r.key} className="t16-row">
                    <span className="t16-ico-tile t16-ico-lg">{r.icon}</span>
                    <span>
                      <small>{r.label}</small>
                      {r.value}
                    </span>
                  </div>
                ),
              )}
            </div>
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t16-connect-hours">
                <small>When we meet</small>
                <ul>
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form ref={formRef} className="t16-form t16-reveal" onSubmit={inbox.onSubmit}>
              <InboxHoneypot />
              <div className="t16-form-row">
                <label className="t16-field">
                  <span>Full name *</span>
                  <input className="t16-input" name="name" autoComplete="name" required />
                </label>
                <label className="t16-field">
                  <span>Phone *</span>
                  <input className="t16-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t16-field">
                <span>Email</span>
                <input className="t16-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t16-field">
                <span>{circles.length ? "Circle you'd like to join" : "Subject"}</span>
                <select className="t16-input" name={circles.length ? "circle" : "subject"} defaultValue="">
                  {circles.length ? (
                    <>
                      <option value="">Not sure yet — help me choose</option>
                      {circles.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="">Membership enquiry</option>
                      <option value="Partnership">Partnership proposal</option>
                      <option value="General">General question</option>
                    </>
                  )}
                </select>
              </label>
              <label className="t16-field">
                <span>Message</span>
                <textarea className="t16-input" name="message" rows={4} placeholder="Tell us a little about yourself and how we can help." />
              </label>
              <button type="submit" disabled={inbox.sending} className="t16-btn t16-btn-solid t16-btn-lg t16-btn-block">
                Send message <IconArrow size={18} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t16-map t16-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
