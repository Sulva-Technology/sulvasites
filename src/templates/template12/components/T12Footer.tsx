"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { directionsHref, quoteHref, useT12 } from "../ctx";
import { Hazard, IconArrow, IconHelmet, IconPhone } from "../icons";
import T12Hours from "./T12Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["linkedin", "LinkedIn"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
];

/** Orange "start your project" call band (skipped where the page already has the quote form) + charcoal footer. */
export default function T12Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT12();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t12-callband">
          <Hazard className="t12-callband-stripe" />
          <div className="t12-container t12-callband-inner t12-reveal">
            <div>
              <p className="t12-label t12-callband-kicker">Next step</p>
              <h2 className="t12-callband-title">Got a job that needs doing?</h2>
              <p className="t12-callband-note">Tell us what you need and where — we&apos;ll get back to you to talk it through.</p>
            </div>
            <div className="t12-actions">
              <a className="t12-btn t12-btn-ink t12-btn-lg" href={quoteHref(ctx)}>
                Request a quote <IconArrow size={18} />
              </a>
              {profile.phone ? (
                <a className="t12-btn t12-btn-outline-ink t12-btn-lg" href={buildTelLink(profile.phone)}>
                  <IconPhone size={17} /> Call {profile.phone}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t12-footer">
        <div className="t12-container">
          <div className="t12-footer-grid">
            <div className="t12-footer-brand">
              <Link href={`${baseUrl}/`} className="t12-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t12-brand-mark" aria-hidden="true">
                    <IconHelmet size={20} />
                  </span>
                )}
                <span className="t12-brand-name">{profile.business_name}</span>
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
                <div className="t12-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <p className="t12-footer-h">Pages</p>
              <div className="t12-footer-links">
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
                <p className="t12-footer-h">Contact</p>
                <div className="t12-footer-links">
                  {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
                  {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
                  {profile.whatsapp ? (
                    <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  {profile.address ? (
                    <>
                      <EditableText
                        as="span"
                        value={profile.address}
                        multiline
                        onCommit={(next) => editor?.updateProfileField?.("address", next)}
                      />
                      <a className="t12-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                        Get directions
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {hours.length || editor?.enabled ? (
              <div>
                <p className="t12-footer-h">Working hours</p>
                <T12Hours className="t12-hours-footer" />
              </div>
            ) : null}
          </div>

          <div className="t12-footer-bar">
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
