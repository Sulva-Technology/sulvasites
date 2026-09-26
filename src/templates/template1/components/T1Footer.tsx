"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { useT1 } from "../ctx";
import { IconArrow } from "../icons";
import { T1Mark } from "./T1Header";

const SOCIALS: Array<[key: string, label: string]> = [
  ["twitter", "X / Twitter"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
];

/** Accent CTA strip + navy footer. */
export default function T1Footer({ logoUrl }: { logoUrl: string | null }) {
  const { baseUrl, navPages, profile, serviceNames } = useT1();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const footerLabels = (socials.footer_labels as Record<string, string>) || {};
  const contactLabel = footerLabels.contact || "Contact";
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      <section className="t1-cta">
        <div className="t1-container t1-cta-inner">
          <h2 className="t1-h2">Let&apos;s talk about what you need to achieve.</h2>
          <Link className="t1-btn t1-btn-white" href={`${baseUrl}/contact`}>
            Book a consultation <IconArrow />
          </Link>
        </div>
      </section>

      <footer className="t1-footer">
        <div className="t1-container">
          <div className="t1-footer-grid">
            <div>
              <Link href={`${baseUrl}/`} className="t1-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <T1Mark />
                )}
                <span className="t1-brand-name">{profile.business_name}</span>
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
            </div>

            <div>
              <h4>Company</h4>
              <div className="t1-footer-links">
                <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
                <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
                {navPages.map((p) => (
                  <Link key={p.key} href={`${baseUrl}/p/${p.key}`}>
                    {p.label}
                  </Link>
                ))}
                <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
              </div>
            </div>

            <div>
              <h4>Services</h4>
              <div className="t1-footer-links">
                {(serviceNames.length ? serviceNames : ["Advisory", "Strategy", "Operations"]).slice(0, 5).map((s) => (
                  <span key={s}>{s}</span>
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
              <div className="t1-footer-links">
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
                {profile.address ? (
                  <EditableText
                    as="span"
                    value={profile.address}
                    multiline
                    onCommit={(next) => editor?.updateProfileField?.("address", next)}
                  />
                ) : null}
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="t1-footer-bar">
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
