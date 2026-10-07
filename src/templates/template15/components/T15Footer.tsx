"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { directionsHref, enquireHref, hoursOf, useT15 } from "../ctx";
import { IconArrow, IconPhone } from "../icons";
import { T15Mark } from "./T15Header";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["twitter", "X"],
  ["linkedin", "LinkedIn"],
];

/** Glass "find your next car" panel (skipped where the page already has the enquiry form) + quiet footer. */
export default function T15Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT15();
  const { baseUrl, navPages, profile, pageKind, pageHasForm } = ctx;
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);
  const hours = hoursOf(profile);

  return (
    <>
      {pageKind !== "contact" && !pageHasForm ? (
        <section className="t15-section t15-cta-section">
          <div className="t15-container">
            <div className="t15-cta t15-glass t15-reveal">
              <span className="t15-cta-glow" aria-hidden="true" />
              <h2 className="t15-h2">Found the one? Let&apos;s talk.</h2>
              <p className="t15-cta-lead">
                Ask about a car, book a private viewing or tell us what you&apos;re looking for — we&apos;ll come back to you personally.
              </p>
              <div className="t15-actions t15-actions-center">
                <a className="t15-btn t15-btn-solid t15-btn-lg" href={enquireHref(ctx)}>
                  Make an enquiry <IconArrow size={18} />
                </a>
                {profile.phone ? (
                  <a className="t15-btn t15-btn-glass t15-btn-lg" href={buildTelLink(profile.phone)}>
                    <IconPhone size={16} /> {profile.phone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="t15-footer">
        <div className="t15-container">
          <div className="t15-footer-grid">
            <div className="t15-footer-brand">
              <Link href={`${baseUrl}/`} className="t15-brand">
                <T15Mark logoUrl={logoUrl} name={profile.business_name} />
                <span className="t15-brand-name">{profile.business_name}</span>
              </Link>
              {profile.tagline || editor?.enabled ? (
                <EditableText
                  as="p"
                  className="t15-muted"
                  value={profile.tagline || ""}
                  placeholder="Tagline (optional)"
                  multiline
                  onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
                />
              ) : null}
            </div>

            <div>
              <p className="t15-footer-h">Explore</p>
              <div className="t15-footer-links">
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
                <p className="t15-footer-h">Visit</p>
                <div className="t15-footer-links">
                  {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
                  {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
                  {profile.whatsapp ? (
                    <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  {profile.address ? (
                    <a href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                      {profile.address}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {hours.length ? (
              <div>
                <p className="t15-footer-h">Showroom hours</p>
                <ul className="t15-footer-hours">
                  {hours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="t15-footer-bar">
            <span>
              © {new Date().getFullYear()} {profile.business_name}. All rights reserved.
            </span>
            {activeSocials.length ? (
              <span className="t15-footer-socials">
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </span>
            ) : null}
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
