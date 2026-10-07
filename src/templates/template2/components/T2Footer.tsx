"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { useT2 } from "../ctx";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["twitter", "X / Twitter"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
];

export default function T2Footer() {
  const { baseUrl, navPages, profile } = useT2();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const footerLabels = (socials.footer_labels as Record<string, string>) || {};
  const contactLabel = footerLabels.contact || "Contact";
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <footer className="t2-footer">
      <div className="t2-container">
        <div className="t2-footer-grid">
          <div>
            {profile.tagline || editor?.enabled ? (
              <EditableText
                as="p"
                className="t2-footer-tag"
                value={profile.tagline || ""}
                placeholder="Tagline (optional)"
                multiline
                onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
              />
            ) : (
              <p className="t2-footer-tag">Stories, work and ideas worth sharing.</p>
            )}
          </div>

          <div>
            <h4>Sections</h4>
            <div className="t2-footer-links">
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
            <div className="t2-footer-links">
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
              {profile.address ? (
                <EditableText as="span" value={profile.address} multiline onCommit={(next) => editor?.updateProfileField?.("address", next)} />
              ) : null}
            </div>
          </div>

          <div>
            <h4>Follow</h4>
            <div className="t2-footer-links">
              {activeSocials.length ? (
                activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label} ↗
                  </a>
                ))
              ) : (
                <span>Coming soon</span>
              )}
            </div>
          </div>
        </div>

        <div className="t2-footer-mast" aria-hidden="true">
          {profile.business_name}
        </div>

        <div className="t2-footer-bar">
          <span>
            © {new Date().getFullYear()} {profile.business_name}
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
  );
}
