"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, hoursOf, joinHref, useT16 } from "../ctx";
import { IconArrow, IconChat } from "../icons";
import { T16Mark } from "./T16Header";

const SOCIALS: Array<[key: string, label: string, short: string]> = [
  ["instagram", "Instagram", "IG"],
  ["youtube", "YouTube", "YT"],
  ["tiktok", "TikTok", "TT"],
  ["facebook", "Facebook", "FB"],
  ["twitter", "X", "X"],
  ["linkedin", "LinkedIn", "IN"],
];

/** Deep-blue "ready to join?" panel (skipped where the page already has the join form) + four-column footer. */
export default function T16Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT16();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, circles } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);
  const hours = hoursOf(profile);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t16-section t16-cta-section">
          <div className="t16-container t16-container-narrow">
            <div className="t16-cta t16-reveal">
              <span className="t16-cta-glow" aria-hidden="true" />
              <h2 className="t16-h2">
                Ready to belong?
                <br />
                <span className="t16-cta-soft">Join {profile.business_name}.</span>
              </h2>
              <p className="t16-cta-lead">
                Become part of a community that grows together — we&apos;ll welcome you personally and help you find your place.
              </p>
              <div className="t16-actions t16-actions-center">
                {profile.whatsapp ? (
                  <a className="t16-btn t16-btn-white t16-btn-lg" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                    <IconChat size={16} /> Join via WhatsApp
                  </a>
                ) : null}
                <a className={`t16-btn ${profile.whatsapp ? "t16-btn-onblue" : "t16-btn-white"} t16-btn-lg`} href={joinHref(ctx)}>
                  Become a member <IconArrow size={18} />
                </a>
              </div>
              <p className="t16-cta-note">Personal welcome · No pressure · Leave any time</p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t16-footer">
        <div className="t16-container">
          <div className="t16-footer-grid">
            <div className="t16-footer-brand">
              <Link href={`${baseUrl}/`} className="t16-brand">
                <T16Mark logoUrl={logoUrl} name={profile.business_name} />
                <span className="t16-brand-name">{profile.business_name}</span>
              </Link>
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  as="p"
                  className="t16-muted"
                  value={profile.tagline || ""}
                  placeholder="Tagline (optional)"
                  multiline
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                />
              ) : null}
              {activeSocials.length ? (
                <span className="t16-footer-socials">
                  {activeSocials.map(([k, label, short]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                      {short}
                    </a>
                  ))}
                </span>
              ) : null}
            </div>

            <div>
              <p className="t16-footer-h">Quick links</p>
              <div className="t16-footer-links">
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

            {circles.length ? (
              <div>
                <p className="t16-footer-h">Communities</p>
                <div className="t16-footer-links">
                  {circles.slice(0, 6).map((c) => (
                    <a key={c} href={joinHref(ctx, c)}>
                      {c}
                    </a>
                  ))}
                </div>
              </div>
            ) : hours.length ? (
              <div>
                <p className="t16-footer-h">When we meet</p>
                <ul className="t16-footer-hours">
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="t16-footer-h">Contact us</p>
              <div className="t16-footer-links">
                {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
                {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
                {profile.address ? (
                  <a href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                    {profile.address}
                  </a>
                ) : null}
              </div>
              {profile.whatsapp ? (
                <a className="t16-btn t16-btn-wa t16-btn-block t16-footer-wa" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  <IconChat size={16} /> Join via WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="t16-footer-bar">
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
