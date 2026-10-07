"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { useT4 } from "../ctx";
import { IconArrow } from "../icons";

const SOCIALS: Array<[key: string, label: string]> = [
  ["twitter", "X / Twitter"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
];

/** Closing CTA card + footer. */
export default function T4Footer({ logoUrl }: { logoUrl: string | null }) {
  const { baseUrl, navPages, profile } = useT4();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const footerLabels = (socials.footer_labels as Record<string, string>) || {};
  const contactLabel = footerLabels.contact || "Contact";
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      <section className="t4-cta">
        <div className="t4-cta-inner">
          <h2 className="t4-h2">Ready when you are.</h2>
          <p>Join the people already using {profile.business_name}. Getting started takes minutes.</p>
          <div className="t4-hero-actions">
            <Link className="t4-btn" href={`${baseUrl}/contact`}>
              Get started <IconArrow />
            </Link>
            <Link className="t4-btn t4-btn-light" href={`${baseUrl}/about`}>
              Learn more
            </Link>
          </div>
        </div>
      </section>

      <footer className="t4-footer">
        <div className="t4-container">
          <div className="t4-footer-grid">
            <div>
              <Link href={`${baseUrl}/`} className="t4-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t4-logo" aria-hidden="true" />
                )}
                <span className="t4-brand-name">{profile.business_name}</span>
              </Link>
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  as="p"
                  className="t4-muted"
                  value={profile.tagline || ""}
                  placeholder="Tagline (optional)"
                  multiline
                  style={{ marginTop: 16, maxWidth: 320 }}
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                />
              ) : null}
            </div>

            <div>
              <h4>Product</h4>
              <div className="t4-footer-links">
                <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
                {navPages.map((p) => (
                  <Link key={p.key} href={navPageHref(baseUrl, p)}>
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4>Company</h4>
              <div className="t4-footer-links">
                <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
                <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
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
              <div className="t4-footer-links">
                {profile.email ? (
                  <a href={buildEmailLink(profile.email)}>
                    <EditableText
                      value={profile.email}
                      onCommit={(next) => editor?.updateProfileField?.("email", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                ) : null}
                {profile.phone ? (
                  <a href={buildTelLink(profile.phone)}>
                    <EditableText
                      value={profile.phone}
                      onCommit={(next) => editor?.updateProfileField?.("phone", next)}
                      style={{ display: "inline" }}
                    />
                  </a>
                ) : null}
                {profile.whatsapp ? (
                  <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {profile.address ? <span>{profile.address}</span> : null}
              </div>
            </div>
          </div>

          <div className="t4-footer-bar">
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
