"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { directionsHref, reserveHref, shopHref, useT7 } from "../ctx";
import { IconArrow, IconCutlery, IconPhone, Ornament } from "../icons";
import T7Hours from "./T7Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
];

/** Closing "join us" band (hidden on the contact page, which has the form) + footer. */
export default function T7Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT7();
  const { baseUrl, navPages, profile, photos, pageKind, hours } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);
  const bandPhoto = photos[2] ?? photos[0];

  return (
    <>
      {pageKind !== "contact" && pageKind !== "shop" ? (
        <section className="t7-band" data-photo={!!bandPhoto}>
          {bandPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="t7-band-img" src={bandPhoto.url} alt="" loading="lazy" />
          ) : null}
          <div className="t7-container t7-band-inner t7-reveal">
            <Ornament size={14} />
            <h2 className="t7-h2">Join us at the table</h2>
            {hours[0] ? <p className="t7-band-note">{hours.slice(0, 2).join("  /  ")}</p> : null}
            <div className="t7-actions">
              <a className="t7-btn t7-btn-cream" href={reserveHref(ctx)}>
                Reserve a table <IconArrow size={16} />
              </a>
              {ctx.shop ? (
                <a className="t7-btn t7-btn-glass" href={shopHref(baseUrl)}>
                  Order online
                </a>
              ) : profile.phone ? (
                <a className="t7-btn t7-btn-glass" href={buildTelLink(profile.phone)}>
                  <IconPhone size={16} /> Call us
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t7-footer">
        <div className="t7-container">
          <div className="t7-footer-grid">
            <div className="t7-footer-brand">
              <Link href={`${baseUrl}/`} className="t7-brand">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={profile.business_name} />
                ) : (
                  <span className="t7-brand-mark" aria-hidden="true">
                    <IconCutlery size={18} />
                  </span>
                )}
                <span className="t7-brand-name">{profile.business_name}</span>
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
                <div className="t7-socials">
                  {activeSocials.map(([k, label]) => (
                    <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h4>Visit</h4>
              <div className="t7-footer-links">
                {profile.address ? (
                  <>
                    <EditableText
                      as="span"
                      value={profile.address}
                      multiline
                      onCommit={(next) => editor?.updateProfileField?.("address", next)}
                    />
                    <a className="t7-footer-link" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
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

            {hours.length || editor?.enabled ? (
              <div>
                <h4>Hours</h4>
                <T7Hours className="t7-hours-footer" />
              </div>
            ) : null}

            <div>
              <h4>Explore</h4>
              <div className="t7-footer-links">
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

          <div className="t7-footer-word" aria-hidden="true">
            {profile.business_name}
          </div>

          <div className="t7-footer-bar">
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
