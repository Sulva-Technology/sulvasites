"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { propertiesHref, useT6 } from "../ctx";
import { IconArrow, IconBuilding } from "../icons";

const SOCIALS: Array<[key: string, short: string, label: string]> = [
  ["instagram", "IG", "Instagram"],
  ["facebook", "FB", "Facebook"],
  ["twitter", "X", "X / Twitter"],
  ["tiktok", "TT", "TikTok"],
];

/** Closing call-to-action band + footer. */
export default function T6Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT6();
  const { baseUrl, navPages, profile } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const footerLabels = (socials.footer_labels as Record<string, string>) || {};
  const contactLabel = footerLabels.contact || "Get in touch";
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      <section className="t6-cta">
        <div className="t6-cta-inner">
          <h2 className="t6-h2">Ready to find your next property?</h2>
          <div className="t6-hero-actions">
            <Link className="t6-btn t6-btn-light" href={propertiesHref(ctx)}>
              Browse properties <IconArrow />
            </Link>
            <Link className="t6-btn t6-btn-glass" href={`${baseUrl}/contact`}>
              Talk to an agent
            </Link>
          </div>
        </div>
      </section>

      <footer className="t6-footer">
        <div className="t6-container">
          <div className="t6-footer-grid">
            <div>
              <Link href={`${baseUrl}/`} className="t6-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t6-brand-mark" aria-hidden="true">
                    <IconBuilding size={20} />
                  </span>
                )}
                <span className="t6-brand-name">{profile.business_name}</span>
              </Link>
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  as="p"
                  value={profile.tagline || ""}
                  placeholder="Tagline (optional)"
                  multiline
                  style={{ marginTop: 18, maxWidth: 340 }}
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                />
              ) : null}
              {activeSocials.length ? (
                <div className="t6-socials">
                  {activeSocials.map(([k, short, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer" aria-label={label}>
                      {short}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h4>Explore</h4>
              <div className="t6-footer-links">
                <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
                {navPages.map((p) => (
                  <Link key={p.key} href={navPageHref(baseUrl, p)}>
                    {p.label}
                  </Link>
                ))}
                <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
                <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
              </div>
            </div>

            <div>
              <h4>
                <EditableText
                  value={contactLabel}
                  onCommit={(next) =>
                    editor?.updateProfileField?.("socials", { ...socials, footer_labels: { ...footerLabels, contact: next } })
                  }
                />
              </h4>
              <div className="t6-footer-links">
                {profile.phone ? (
                  <a href={buildTelLink(profile.phone)}>
                    <EditableText
                      value={profile.phone}
                      onCommit={(next) => editor?.updateProfileField?.("phone", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                ) : null}
                {profile.email ? (
                  <a href={buildEmailLink(profile.email)}>
                    <EditableText
                      value={profile.email}
                      onCommit={(next) => editor?.updateProfileField?.("email", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                ) : null}
                {profile.whatsapp ? (
                  <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            <div>
              <h4>Office</h4>
              <div className="t6-footer-links">
                {profile.address ? (
                  <EditableText
                    as="span"
                    value={profile.address}
                    multiline
                    onCommit={(next) => editor?.updateProfileField?.("address", next)}
                  />
                ) : (
                  <span>By appointment</span>
                )}
              </div>
            </div>
          </div>

          <div className="t6-footer-bar">
            <span>
              © {new Date().getFullYear()} {profile.business_name}. All rights reserved.
            </span>
            <span>
              Developed by{" "}
              <a href="https://sulvatech.com" target="_blank" rel="noreferrer">
                Sulvatech
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
