"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T9Hours from "../components/T9Hours";
import { directionsHref, useT9 } from "../ctx";
import { IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";
import { InboxHoneypot, InboxStatus, useInboxForm } from "@/templates/shared/inbox";

const GOALS = ["Get stronger", "Lose weight", "Get fitter", "Move better"];
const LEVELS = ["New to training", "Some experience", "Train regularly"];

/**
 * "Start your free trial": black slanted band with contact rows and hours beside a sign-up form
 * (or a map when the form is off). `?service=` from "Book class" / "Choose plan" preselects the
 * class select, or prefills the message when the site lists no classes.
 */
export default function T9ContactCard({ section }: { section: ContactCardSection }) {
  const { profile, hours, pageKind, classNames } = useT9();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const service = new URLSearchParams(window.location.search).get("service")?.trim();
    const form = formRef.current;
    if (!service || !form) return;
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
    <div className="t9-join-rows">
      {profile.phone ? (
        <a className="t9-join-row" href={buildTelLink(profile.phone)}>
          <span className="t9-join-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t9-join-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t9-join-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t9-join-row" href={buildEmailLink(profile.email)}>
          <span className="t9-join-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t9-join-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t9-join-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t9-join-row">
            <span className="t9-join-ico"><IconPin /></span>
            <span><small>Find us</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id="join" className="t9-section t9-band t9-join-section">
      <div className="t9-container">
        <div className="t9-join" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t9-join-info t9-reveal">
            <span className="t9-kicker">{section.showForm ? "Free trial" : "Visit"}</span>
            <h2 className="t9-h2">
              {section.showForm ? (
                <>
                  Start your <em>free trial</em>
                </>
              ) : (
                <>
                  Come <em>train</em> with us
                </>
              )}
            </h2>
            <p className="t9-join-lead">
              {section.showForm
                ? "Tell us what you're training for and how much experience you have. Prefer to talk? Call or message us."
                : "Call, message or drop in — we'll show you around."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t9-join-hours">
                <small>Opening hours</small>
                <T9Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t9-form t9-reveal"
              onSubmit={inbox.onSubmit}
            >
              <InboxHoneypot />
              <div className="t9-form-title">
                <h3>Claim your trial</h3>
                <small>* required</small>
              </div>

              {classNames.length ? (
                <label className="t9-field">
                  <span>Class or plan</span>
                  <select className="t9-input" name="service" defaultValue="">
                    <option value="">Choose a class</option>
                    {classNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Not sure">Not sure yet — help me choose</option>
                  </select>
                </label>
              ) : null}

              <fieldset className="t9-field t9-fieldset">
                <legend>Main goal</legend>
                <div className="t9-chips">
                  {GOALS.map((g, i) => (
                    <label key={g} className="t9-chip-opt">
                      <input type="radio" name="goal" value={g} defaultChecked={i === 0} />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="t9-field t9-fieldset">
                <legend>Experience</legend>
                <div className="t9-chips">
                  {LEVELS.map((l, i) => (
                    <label key={l} className="t9-chip-opt">
                      <input type="radio" name="level" value={l} defaultChecked={i === 0} />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="t9-form-row">
                <label className="t9-field">
                  <span>Full name *</span>
                  <input className="t9-input" name="name" autoComplete="name" required />
                </label>
                <label className="t9-field">
                  <span>Phone *</span>
                  <input className="t9-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t9-field">
                <span>Email</span>
                <input className="t9-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t9-field">
                <span>Message</span>
                <textarea className="t9-input" name="message" rows={3} placeholder="Injuries, schedule, anything we should know?" />
              </label>
              <button type="submit" disabled={inbox.sending} className="t9-btn t9-btn-block t9-btn-lg">
                Request free trial <IconArrow size={18} />
              </button>
              <InboxStatus state={inbox.state} />
            </form>
          ) : mapEmbedUrl ? (
            <div className="t9-map t9-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
