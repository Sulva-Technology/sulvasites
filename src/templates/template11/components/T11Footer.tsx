"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, planHref, useT11 } from "../ctx";
import { Confetti, IconArrow, IconChat, IconSparkle, Mesh } from "../icons";
import T11Hours from "./T11Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Gradient "got something to celebrate?" invite (skipped where the page already has the form) + plum footer. */
export default function T11Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT11();
  const { baseUrl, navPages, profile, pageKind, pageHasForm, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t11-invite">
          <div className="t11-container">
            <div className="t11-invite-card t11-reveal">
              <Mesh className="t11-mesh-invite" />
              <Confetti set="band" />
              <span className="t11-invite-kicker">
                <IconSparkle size={14} /> You&apos;re invited
              </span>
              <h2 className="t11-invite-title">Got something to celebrate?</h2>
              <p>Share the occasion, the date and roughly how many guests, and let&apos;s start planning.</p>
              <div className="t11-actions t11-actions-center">
                <a className="t11-btn t11-btn-peach t11-btn-lg" href={planHref(ctx)}>
                  Plan your event <IconArrow size={18} />
                </a>
                {profile.whatsapp ? (
                  <a className="t11-btn t11-btn-glass t11-btn-lg" href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                    <IconChat size={17} /> WhatsApp us
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t11-footer">
        <div className="t11-container">
          <div className="t11-footer-grid">
            <div className="t11-footer-brand">
              <Link href={`${baseUrl}/`} className="t11-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t11-brand-mark" aria-hidden="true">
                    <IconSparkle size={18} />
                  </span>
                )}
                <span className="t11-brand-name">{profile.business_name}</span>
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
                <div className="t11-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <p className="t11-footer-h">Explore</p>
              <div className="t11-footer-links">
                <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
                {navPages.map((p) => (
                  <Link key={p.key} href={`${baseUrl}/p/${p.key}`}>
                    {p.label}
                  </Link>
                ))}
                <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
                <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
              </div>
            </div>

            {profile.address || profile.phone || profile.email || profile.whatsapp ? (
              <div>
                <p className="t11-footer-h">Say hello</p>
                <div className="t11-footer-links">
                  {profile.address ? (
                    <>
                      <EditableText
                        as="span"
                        value={profile.address}
                        multiline
                        onCommit={(next) => editor?.updateProfileField?.("address", next)}
                      />
                      <a className="t11-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
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
                <p className="t11-footer-h">Opening hours</p>
                <T11Hours className="t11-hours-footer" />
              </div>
            ) : null}
          </div>

          <div className="t11-footer-bar">
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
