"use client";

import { useEffect, useRef } from "react";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import T12Hours from "../components/T12Hours";
import { directionsHref, useT12 } from "../ctx";
import { Hazard, IconArrow, IconChat, IconMail, IconPhone, IconPin } from "../icons";

/**
 * "Request a quote": a charcoal panel with contact rows and working hours beside a square quote
 * form (or a map when the form is off). `?service=` prefills the form, and the home hero's
 * mini-form hands name and phone over via sessionStorage (legacy `?name=`/`?phone=` still work
 * and are stripped from the URL).
 */
export default function T12ContactCard({
  section,
  anchor,
}: {
  section: ContactCardSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { profile, hours, pageKind, services } = useT12();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service")?.trim();
    let name = params.get("name")?.trim();
    let phone = params.get("phone")?.trim();

    // Hero mini-form hands name/phone over via sessionStorage (read once, then removed).
    try {
      const raw = window.sessionStorage.getItem("t12-quote-prefill");
      if (raw) {
        window.sessionStorage.removeItem("t12-quote-prefill");
        const saved = JSON.parse(raw) as { name?: unknown; phone?: unknown };
        if (!name && typeof saved.name === "string") name = saved.name.trim();
        if (!phone && typeof saved.phone === "string") phone = saved.phone.trim();
      }
    } catch {
      /* storage blocked or bad JSON: ignore */
    }

    // Old-style links carried name/phone in the URL: prefill from them, then strip them.
    if (params.has("name") || params.has("phone")) {
      params.delete("name");
      params.delete("phone");
      const qs = params.toString();
      try {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
        );
      } catch {
        /* ignore */
      }
    }
    const field = <T extends Element>(n: string) => form.elements.namedItem(n) as T | null;

    if (name) {
      const el = field<HTMLInputElement>("name");
      if (el && !el.value) el.value = name;
    }
    if (phone) {
      const el = field<HTMLInputElement>("phone");
      if (el && !el.value) el.value = phone;
    }
    if (service) {
      const select = field<HTMLSelectElement>("service");
      if (select) {
        if (![...select.options].some((o) => o.value === service)) select.add(new Option(service, service), 1);
        select.value = service;
      } else {
        const message = field<HTMLTextAreaElement>("message");
        if (message && !message.value) message.value = `I'd like a quote for: ${service}.`;
      }
    }
  }, []);

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
    <div className="t12-rows">
      {profile.phone ? (
        <a className="t12-row" href={buildTelLink(profile.phone)}>
          <span className="t12-row-ico"><IconPhone /></span>
          <span><small>Call</small>{profile.phone}</span>
        </a>
      ) : null}
      {profile.whatsapp ? (
        <a className="t12-row" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
          <span className="t12-row-ico"><IconChat /></span>
          <span><small>WhatsApp</small>Message us</span>
        </a>
      ) : null}
      {profile.email ? (
        <a className="t12-row" href={buildEmailLink(profile.email)}>
          <span className="t12-row-ico"><IconMail /></span>
          <span><small>Email</small>{profile.email}</span>
        </a>
      ) : null}
      {profile.address ? (
        mapHref ? (
          <a className="t12-row" href={mapHref} target="_blank" rel="noreferrer">
            <span className="t12-row-ico"><IconPin /></span>
            <span><small>Yard / office</small>{profile.address}</span>
          </a>
        ) : (
          <div className="t12-row">
            <span className="t12-row-ico"><IconPin /></span>
            <span><small>Yard / office</small>{profile.address}</span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <section id={anchor ? "quote" : undefined} className="t12-section t12-quote-section">
      <div className="t12-container">
        <div className="t12-quote" data-form={section.showForm} data-map={!section.showForm && !!mapEmbedUrl}>
          <div className="t12-quote-info t12-dark t12-reveal">
            <Hazard className="t12-quote-stripe" />
            <p className="t12-label t12-kicker">
              <span className="t12-kicker-sq" aria-hidden="true" /> {section.showForm ? "Quotes" : "Contact"}
            </p>
            <h2 className="t12-h2">{section.showForm ? "Request a quote" : "Talk to us"}</h2>
            <p className="t12-quote-lead">
              {section.showForm
                ? "Tell us what needs doing and where. Prefer to talk? Call or message us."
                : "Call, message or email — tell us about the job and we'll take it from there."}
            </p>
            {rows}
            {hours.length > 0 && pageKind !== "contact" ? (
              <div className="t12-quote-hours">
                <small>Working hours</small>
                <T12Hours />
              </div>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              ref={formRef}
              className="t12-form t12-reveal"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Online quote requests are not set up yet. Please call, WhatsApp or email us about your job.");
              }}
            >
              <div className="t12-form-title">
                <h3>Job details</h3>
                <small>* required</small>
              </div>

              {services.length ? (
                <label className="t12-field">
                  <span>Service</span>
                  <select className="t12-input" name="service" defaultValue="">
                    <option value="" disabled>
                      Choose a service
                    </option>
                    {services.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Something else">Something else</option>
                  </select>
                </label>
              ) : null}

              <div className="t12-form-row">
                <label className="t12-field">
                  <span>Your name *</span>
                  <input className="t12-input" name="name" autoComplete="name" required />
                </label>
                <label className="t12-field">
                  <span>Phone *</span>
                  <input className="t12-input" name="phone" type="tel" autoComplete="tel" required />
                </label>
              </div>
              <label className="t12-field">
                <span>Email</span>
                <input className="t12-input" name="email" type="email" autoComplete="email" />
              </label>
              <label className="t12-field">
                <span>About the job</span>
                <textarea
                  className="t12-input"
                  name="message"
                  rows={4}
                  placeholder="What needs doing, where the property is, and when you'd like it done…"
                />
              </label>
              <button type="submit" className="t12-btn t12-btn-block t12-btn-lg">
                Send request <IconArrow size={18} />
              </button>
            </form>
          ) : mapEmbedUrl ? (
            <div className="t12-map t12-reveal">
              <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
