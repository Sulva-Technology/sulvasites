"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T10Hours from "../components/T10Hours";
import { directionsHref, useT10 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

const INTENTS: Array<{ value: string; label: string; key: string }> = [
  { key: "apply", value: "Apply / enrol", label: "Apply / enrol" },
  { key: "visit", value: "Book a visit", label: "Book a visit" },
  { key: "question", value: "Ask a question", label: "Ask a question" },
];
const FOR_WHO = ["My child", "Myself", "Someone else"];

/**
 * "Apply or book a visit": navy card with contact rows and office hours beside an enquiry form
 * (or a map when the form is off). `?intent=visit|question` preselects what the visitor wants,
 * `?service=` the programme (or prefills the message when the site lists no programmes).
 */
export default function T10ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, hours, pageKind, programmes } = useT10();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const form = formRef.current;
    if (!form) return;
    const intent = params.get("intent");
    const match = INTENTS.find((i) => i.key === intent);
    if (match) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="intent"][value="${match.value}"]`);
      if (radio) radio.checked = true;
    }
    const service = params.get("service")?.trim();
    if (!service) return;
    const select = form.elements.namedItem("service") as HTMLSelectElement | null;
    if (select) {
      if (![...select.options].some((o) => o.value === service)) select.add(new Option(service, service), 1);
      select.value = service;
      return;
    }
    const message = form.elements.namedItem("message") as HTMLTextAreaElement | null;
    if (message && !message.value) message.value = `I'm interested in: ${service}.`;
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

  const rows = (
    <div className="t10-apply-rows">
      {profile.phone ? (
        <a className="t10-apply-row" href={buildTelLink(profile.phone)}>
          <span className="t10-apply-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t10-apply-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t10-apply-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t10-apply-row" href={buildEmailLink(profile.email)}>
          <span className="t10-apply-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t10-apply-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t10-apply-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t10-apply-row">
            <span className="t10-apply-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id="apply" className="t10-section t10-apply-section">
      <div className="t10-container">
        <div className="t10-apply" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t10-apply-info t10-reveal">
            <span className="t10-kicker t10-kicker-light">{section.showForm ? "Admissions" : "Visit"}</span>
            <h2 className="t10-h2">
              {section.showForm ? (
                <>
                  Apply or <em>book a visit</em>
                </>
              ) : (
                <>
                  Come and <em>see us</em>
                </>
              )}
            </h2>
            <p className="t10-apply-lead">
              {section.showForm
                ? "Tell us a little about the learner and what you're looking for. Prefer to talk? Call or message us."
                : "Call, message or drop by — we'd love to show you around."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t10-apply-hours">
                <small>Office hours</small>
                <T10Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t10-form t10-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t10-form-title">
                <h3>Send an enquiry</h3>
                <small>* required</small>
              </div>

              <fieldset className="t10-field t10-fieldset">
                <legend>I&apos;d like to</legend>
                <div className="t10-chips">
                  {INTENTS.map((it, i) => (
                    <label key={it.key} className="t10-chip-opt">
                      <input type="radio" name="intent" value={it.value} defaultChecked={i === 0} />
                      <span>{it.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {programmes.length ? (
                <label className="t10-field">
                  <span>Programme</span>
                  <select className="t10-input" name="service" defaultValue="">
                    <option value="">Choose a programme</option>
                    {programmes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Not sure">Not sure yet — help me choose</option>
                  </select>
                </label>
              ) : null}

              <fieldset className="t10-field t10-fieldset">
                <legend>Who is it for?</legend>
                <div className="t10-chips">
                  {FOR_WHO.map((w, i) => (
                    <label key={w} className="t10-chip-opt">
                      <input type="radio" name="for" value={w} defaultChecked={i === 0} />
                      <span>{w}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="t10-form-row">
                <label className="t10-field">
                  <span>Your name *</span>
                  <input className="t10-input" name="name" autoComplete="name" required />
                </label>
                <label className="t10-field">
                  <span>Phone *</span>
                  <input className="t10-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t10-field">
                <span>Email</span>
                <input className="t10-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t10-field">
                <span>Message</span>
                <textarea className="t10-input" name="message" rows={3} placeholder="Age or year group, preferred start date, any questions…" />
              </label>
              <button type="submit" disabled={inbox.sending} className="t10-btn t10-btn-block t10-btn-lg">
                Send enquiry <IconArrow size={18} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t10-map t10-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
