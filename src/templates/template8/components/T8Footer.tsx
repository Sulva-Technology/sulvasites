"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { bookHref, directionsHref, useT8 } from "../ctx";
import { IconArrow, IconCalendar, IconCross, IconPhone } from "../icons";
import T8Hours from "./T8Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["twitter", "X"],
  ["tiktok", "TikTok"],
];

/** Closing booking band (skipped where the page already has the form) + mint footer. */
export default function T8Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT8();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t8-section t8-band-section">
          <div className="t8-container">
            <div className="t8-band t8-reveal">
              <span className="t8-band-ico" aria-hidden="true">
                <IconCalendar size={26} />
              </span>
              <div className="t8-band-text">
                <h2 className="t8-h2">Ready to book your visit?</h2>
                <p>
                  {hours[0]
                    ? `Open ${hours.slice(0, 2).join(" · ")}`
                    : "Send an appointment request or give us a call."}
                </p>
              </div>
              <div className="t8-actions">
                <a className="t8-btn t8-btn-light" href={bookHref(ctx)}>
                  Book appointment <IconArrow size={16} />
                </a>
                {profile.phone ? (
                  <a className="t8-btn t8-btn-glass" href={buildTelLink(profile.phone)}>
                    <IconPhone size={16} /> {profile.phone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t8-footer">
        <div className="t8-container">
          <div className="t8-footer-grid">
            <div className="t8-footer-brand">
              <Link href={`${baseUrl}/`} className="t8-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t8-brand-mark" aria-hidden="true">
                    <IconCross size={16} />
                  </span>
                )}
                <span className="t8-brand-name">{profile.business_name}</span>
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
                <div className="t8-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {profile.address || profile.phone || profile.email || profile.whatsapp ? (
              <div>
                <h3 className="t8-footer-h">Contact</h3>
                <div className="t8-footer-links">
                  {profile.address ? (
                    <>
                      <EditableText
                        as="span"
                        value={profile.address}
                        multiline
                        onCommit={(next) => editor?.updateProfileField?.("address", next)}
                      />
                      <a className="t8-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
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
                <h3 className="t8-footer-h">Opening hours</h3>
                <T8Hours className="t8-hours-footer" />
              </div>
            ) : null}

            <div>
              <h3 className="t8-footer-h">Explore</h3>
              <div className="t8-footer-links">
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
          </div>

          <div className="t8-footer-bar">
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
