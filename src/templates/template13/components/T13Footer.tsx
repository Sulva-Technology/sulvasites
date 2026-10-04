"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, shopHref, useT13 } from "../ctx";
import T13Hours from "./T13Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["twitter", "X"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Black footer: brand, shop categories, pages, contact and opening hours. */
export default function T13Footer({ logoUrl }: { logoUrl: string | null }) {
  const { baseUrl, navPages, profile, hours, shop } = useT13();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);

  return (
    <footer className="t13-footer">
      <div className="t13-container">
        <div className="t13-footer-grid">
          <div className="t13-footer-brand">
            <Link href={`${baseUrl}/`} className="t13-brand">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={profile.business_name} />
              ) : (
                <span className="t13-brand-name">{profile.business_name}</span>
              )}
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
              <div className="t13-socials">
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {shop ? (
            <div>
              <p className="t13-footer-h">Shop</p>
              <div className="t13-footer-links">
                <Link href={shopHref(baseUrl)}>All products</Link>
                {shop.categories.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`${baseUrl}/shop/c/${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="t13-footer-h">Pages</p>
            <div className="t13-footer-links">
              <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
              {navPages.map((p) => (
                <Link key={p.key} href={p.key === "shop" && shop ? shopHref(baseUrl) : `${baseUrl}/p/${p.key}`}>
                  {p.label}
                </Link>
              ))}
              <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
              <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
            </div>
          </div>

          {profile.address || profile.phone || profile.email || profile.whatsapp ? (
            <div>
              <p className="t13-footer-h">Contact</p>
              <div className="t13-footer-links">
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
                    <a className="t13-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                      Get directions
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {hours.length || editor?.enabled ? (
            <div>
              <p className="t13-footer-h">Opening hours</p>
              <T13Hours className="t13-hours-footer" />
            </div>
          ) : null}
        </div>

        <div className="t13-footer-bar">
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
