"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { directionsHref, joinHref, useT9 } from "../ctx";
import { IconArrow, IconBolt, IconPhone } from "../icons";
import T9Hours from "./T9Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Red diagonal call-to-action band (skipped where the page already has the form) + black footer with a giant wordmark. */
export default function T9Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT9();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t9-cta-band">
          <div className="t9-container t9-cta-inner t9-reveal">
            <h2 className="t9-cta-title">
              Ready when <span>you are.</span>
            </h2>
            <div className="t9-actions">
              <a className="t9-btn t9-btn-dark" href={joinHref(ctx)}>
                Start free trial <IconArrow size={18} />
              </a>
              {profile.phone ? (
                <a className="t9-btn t9-btn-outline-light" href={buildTelLink(profile.phone)}>
                  <IconPhone size={16} /> {profile.phone}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t9-footer">
        <div className="t9-container">
          <div className="t9-footer-grid">
            <div className="t9-footer-brand">
              <Link href={`${baseUrl}/`} className="t9-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t9-brand-mark" aria-hidden="true">
                    <IconBolt size={16} />
                  </span>
                )}
                <span className="t9-brand-name">{profile.business_name}</span>
              </Link>
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  as="p"
                  value={profile.tagline || ""}
                  placeholder="Tagline (optional)"
                  multiline
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                />
              ) : null}
              {activeSocials.length ? (
                <div className="t9-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="t9-footer-h">Explore</h3>
              <div className="t9-footer-links">
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

            {profile.address || profile.phone || profile.email || profile.whatsapp ? (
              <div>
                <h3 className="t9-footer-h">Visit</h3>
                <div className="t9-footer-links">
                  {profile.address ? (
                    <>
                      <EditableText
                        as="span"
                        value={profile.address}
                        multiline
                        onCommit={(next) => editor?.updateProfileField?.("address", next)}
                      />
                      <a className="t9-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                        Get directions
                      </a>
                    </>
                  ) : null}
                  {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
                  {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
                  {profile.whatsapp ? (
                    <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {hours.length || editor?.enabled ? (
              <div>
                <h3 className="t9-footer-h">Opening hours</h3>
                <T9Hours className="t9-hours-footer" />
              </div>
            ) : null}
          </div>

          <p
            className="t9-wordmark"
            aria-hidden="true"
            style={{ "--len": Math.max(4, profile.business_name.length) } as CSSProperties}
          >
            {profile.business_name}
          </p>

          <div className="t9-footer-bar">
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
    </>
  );
}
