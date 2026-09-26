"use client";

import type { ContactCardSection } from "@/lib/pageSchema";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { T3ArrowIcon, T3Index } from "../ui";

export default function T3ContactCard({
  section,
  n,
  profile,
}: {
  section: ContactCardSection;
  n?: number;
  profile: {
    business_name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
  };
}) {
  const mapEmbedUrl = (() => {
    const link = section.mapLink?.trim();
    if (link && link.includes("output=embed")) return link;
    if (!profile.address && !link) return null;
    const query = encodeURIComponent(profile.address || profile.business_name);
    return `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  })();

  const details: Array<{ label: string; value: string; href?: string; external?: boolean }> = [];
  if (profile.phone) details.push({ label: "Phone", value: profile.phone, href: buildTelLink(profile.phone) });
  if (profile.whatsapp)
    details.push({ label: "WhatsApp", value: profile.whatsapp, href: buildWhatsAppLink(profile.whatsapp), external: true });
  if (profile.address) details.push({ label: "Studio", value: profile.address });

  return (
    <section id="contact" className="t3-section">
      <div className="t3-container">
        <div className="t3-reveal">
          <T3Index n={n} label="Contact" />
          <h2 className="t3-display t3-contact-title" style={{ marginTop: 24 }}>
            Have a project <em>in mind?</em>
          </h2>
          {profile.email ? (
            <a className="t3-mail" href={buildEmailLink(profile.email)}>
              {profile.email}
            </a>
          ) : null}
        </div>

        <div className="t3-contact-grid">
          <div className="t3-reveal">
            {details.length ? (
              <div className="t3-details">
                {details.map((d) => (
                  <div key={d.label} className="t3-detail">
                    <span className="t3-index">{d.label}</span>
                    {d.href ? (
                      <a href={d.href} target={d.external ? "_blank" : undefined} rel={d.external ? "noreferrer" : undefined}>
                        {d.value}
                      </a>
                    ) : (
                      <span>{d.value}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {mapEmbedUrl ? (
              <div className="t3-map">
                <iframe title="Map" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : null}
            {section.mapLink ? (
              <a className="t3-link" href={section.mapLink} target="_blank" rel="noreferrer" style={{ marginTop: 16 }}>
                Open in Maps
                <span className="t3-arrow">
                  <T3ArrowIcon size={14} />
                </span>
              </a>
            ) : null}
          </div>

          {section.showForm ? (
            <form
              className="t3-form t3-reveal"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Form submission is not configured yet. Please reach out by email or phone.");
              }}
            >
              <div className="t3-form-row">
                <label className="t3-field">
                  <span>Name</span>
                  <input className="t3-input" name="name" placeholder="Your name" required />
                </label>
                <label className="t3-field">
                  <span>Email</span>
                  <input className="t3-input" name="email" type="email" placeholder="you@email.com" required />
                </label>
              </div>
              <label className="t3-field">
                <span>Project</span>
                <textarea className="t3-input" name="message" rows={4} placeholder="Tell me a little about it…" required />
              </label>
              <div>
                <button type="submit" className="t3-btn">
                  Send message
                  <span className="t3-arrow">
                    <T3ArrowIcon />
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="t3-reveal">
              <p className="t3-lead">
                Prefer a conversation? Reach out directly — replies usually within one business day.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
