"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { NavPage } from "@/templates/registry";
import { buildEmailLink, buildTelLink, navPageHref } from "@/templates/shared/links";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["twitter", "X / Twitter"],
  ["tiktok", "TikTok"],
];

export default function T3Footer({
  businessName,
  tagline,
  address,
  phone,
  email,
  socials,
  baseUrl,
  navPages = [],
}: {
  businessName: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  socials: Record<string, string>;
  baseUrl: string;
  navPages?: NavPage[];
}) {
  const editor = useInlineEditor();
  const navLabels = ((socials as Record<string, unknown>).nav_labels as Record<string, string>) || {};
  const footerLabels = ((socials as Record<string, unknown>).footer_labels as Record<string, string>) || {};
  const contactLabel = footerLabels.contact || "Contact";
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <footer className="t3-footer">
      <div className="t3-container">
        <div className="t3-footer-grid">
          <div>
            {tagline || editor?.enabled ? (
              <EditableText
                as="p"
                className="t3-footer-tagline"
                value={tagline || ""}
                placeholder="Tagline (optional)"
                multiline
                onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
              />
            ) : (
              <p className="t3-footer-tagline">Let&apos;s make something worth remembering.</p>
            )}
          </div>

          <div>
            <h4 className="t3-index">Pages</h4>
            <div className="t3-footer-links">
              <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
              <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
              {navPages.map((p) => (
                <Link key={p.key} href={navPageHref(baseUrl, p)}>
                  {p.label}
                </Link>
              ))}
              <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
            </div>
          </div>

          <div>
            <h4 className="t3-index">
              <EditableText
                value={contactLabel}
                onCommit={(next) =>
                  editor?.updateProfileField?.("socials", {
                    ...socials,
                    footer_labels: { ...footerLabels, contact: next },
                  })
                }
              />
            </h4>
            <div className="t3-footer-links">
              {email ? (
                <a href={buildEmailLink(email)}>
                  <EditableText
                    value={email}
                    onCommit={(next) => editor?.updateProfileField?.("email", next)}
                    style={{ display: "inline" }}
                  />
                </a>
              ) : null}
              {phone ? (
                <a href={buildTelLink(phone)}>
                  <EditableText
                    value={phone}
                    onCommit={(next) => editor?.updateProfileField?.("phone", next)}
                    style={{ display: "inline" }}
                  />
                </a>
              ) : null}
              {address ? (
                <span className="t3-muted">
                  <EditableText
                    value={address}
                    multiline
                    onCommit={(next) => editor?.updateProfileField?.("address", next)}
                  />
                </span>
              ) : null}
            </div>
          </div>

          {activeSocials.length ? (
            <div>
              <h4 className="t3-index">Follow</h4>
              <div className="t3-footer-links">
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k]} target="_blank" rel="noreferrer">
                    {label} ↗
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="t3-wordmark" aria-hidden="true">
          {businessName}
        </div>
      </div>

      <div className="t3-footer-bar">
        <div className="t3-container" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span className="t3-muted">
            © {new Date().getFullYear()} {businessName}. Developed by{" "}
            <a href="https://sulvatech.com" target="_blank" rel="noreferrer">
              Sulvatech
            </a>
          </span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
