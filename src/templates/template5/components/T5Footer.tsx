"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { useT5 } from "../ctx";
import { IconInstagram } from "../icons";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["twitter", "X"],
];

export default function T5Footer() {
  const { baseUrl, navPages, profile } = useT5();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <footer className="t5-footer">
      <div className="t5-container">
        <div className="t5-footer-name">
          <EditableText
            value={profile.business_name}
            onCommit={(next) => editor?.updateProfileField?.("business_name", next)}
            style={{ display: "inline" }}
          />
        </div>
        {profile.tagline || editor?.enabled ? (
          <EditableText
            as="p"
            className="t5-footer-tag"
            value={profile.tagline || ""}
            placeholder="Tagline (optional)"
            multiline
            onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
          />
        ) : null}

        <nav className="t5-footer-nav" aria-label="Footer">
          <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
          {navPages.map((p) => (
            <Link key={p.key} href={navPageHref(baseUrl, p)}>
              {p.label}
            </Link>
          ))}
          <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
          <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
        </nav>

        <div className="t5-footer-contact">
          {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
          {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
          {profile.whatsapp ? (
            <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {profile.address ? <span>{profile.address}</span> : null}
        </div>

        {activeSocials.length ? (
          <div className="t5-footer-socials">
            {activeSocials.map(([k, label]) => (
              <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                {k === "instagram" ? <IconInstagram /> : label.slice(0, 2)}
              </a>
            ))}
          </div>
        ) : null}

        <div className="t5-footer-bar">
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
