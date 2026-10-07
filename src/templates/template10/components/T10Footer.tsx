"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { applyHref, directionsHref, useT10 } from "../ctx";
import { IconArrow, IconCalendar, IconCap, Scribble } from "../icons";
import T10Hours from "./T10Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Sunflower "ready to start?" card (skipped where the page already has the form) + navy footer. */
export default function T10Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT10();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t10-cta">
          <div className="t10-container">
            <div className="t10-cta-card t10-reveal">
              <span className="t10-cta-dots" aria-hidden="true" />
              <div className="t10-cta-copy">
                <h2 className="t10-cta-title">
                  Ready to start{" "}
                  <span className="t10-hl t10-hl-navy">
                    learning?
                    <Scribble className="t10-scribble" />
                  </span>
                </h2>
                <p>Send an enquiry, book a visit or ask us anything — we&apos;re happy to help you choose.</p>
              </div>
              <div className="t10-actions">
                <a className="t10-btn t10-btn-navy" href={applyHref(ctx)}>
                  Apply now <IconArrow size={18} />
                </a>
                <a className="t10-btn t10-btn-outline-navy" href={applyHref(ctx, { intent: "visit" })}>
                  <IconCalendar size={17} /> Book a visit
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t10-footer">
        <div className="t10-container">
          <div className="t10-footer-grid">
            <div className="t10-footer-brand">
              <Link href={`${baseUrl}/`} className="t10-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t10-brand-mark" aria-hidden="true">
                    <IconCap size={20} />
                  </span>
                )}
                <span className="t10-brand-name">{profile.business_name}</span>
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
                <div className="t10-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="t10-footer-h">Explore</h3>
              <div className="t10-footer-links">
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
                <h3 className="t10-footer-h">Get in touch</h3>
                <div className="t10-footer-links">
                  {profile.address ? (
                    <>
                      <EditableText
                        as="span"
                        value={profile.address}
                        multiline
                        onCommit={(next) => editor?.updateProfileField?.("address", next)}
                      />
                      <a className="t10-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
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
                <h3 className="t10-footer-h">Office hours</h3>
                <T10Hours className="t10-hours-footer" />
              </div>
            ) : null}
          </div>

          <div className="t10-footer-bar">
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
