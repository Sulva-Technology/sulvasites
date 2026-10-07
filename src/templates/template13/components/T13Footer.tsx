"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { ModeToggle } from "@/templates/shared/colorMode";
import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { directionsHref, shopHref, useT13 } from "../ctx";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["twitter", "X"],
  ["x", "X"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Dark footer: giant serif wordmark with tagline, four link columns, hairline and copyright. */
export default function T13Footer({ logoUrl }: { logoUrl: string | null }) {
  const { baseUrl, navPages, profile, shop, mode, toggleMode, hasSizeGuidePage } = useT13();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const seen = new Set<string>();
  const activeSocials = SOCIALS.filter(([k, label]) => {
    // "twitter" and "x" both mean X: show it once.
    if (typeof socials[k] !== "string" || !socials[k] || seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  return (
    <footer className="t13-footer">
      <div className="t13-container t13-footer-grid">
        <div className="t13-footer-brand">
          {logoUrl ? (
            <Link href={`${baseUrl}/`} className="t13-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={profile.business_name} />
            </Link>
          ) : null}
          <p className="t13-footer-word">{profile.business_name}</p>
          {profile.tagline || editor?.enabled ? (
            <EditableText
              as="p"
              className="t13-footer-tag"
              value={profile.tagline || ""}
              placeholder="Tagline (optional)"
              multiline
              onCommit={(next) => editor?.updateProfileField?.("tagline", next)}
            />
          ) : null}
        </div>

        {shop ? (
          <nav aria-label="Shop">
            <h3>Shop</h3>
            {shop.categories.slice(0, 6).map((c) => (
              <Link key={c.id} href={`${baseUrl}/shop/c/${c.slug}`}>
                {c.name}
              </Link>
            ))}
            <Link href={shopHref(baseUrl)}>All products</Link>
          </nav>
        ) : null}

        <nav aria-label="Company">
          <h3>Company</h3>
          <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
          {navPages
            .filter((p) => !(hasSizeGuidePage && p.key === "size-guide"))
            .map((p) => (
            <Link key={p.key} href={p.key === "shop" && shop ? shopHref(baseUrl) : navPageHref(baseUrl, p)}>
              {p.label}
            </Link>
          ))}
          <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
        </nav>

        <nav aria-label="Help">
          <h3>Help</h3>
          {hasSizeGuidePage ? <Link href={`${baseUrl}/p/size-guide`}>Size guide</Link> : null}
          <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
          {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
          {profile.whatsapp ? (
            <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          {profile.address || editor?.enabled ? (
            <>
              <EditableText
                as="p"
                className="t13-footer-address"
                value={profile.address || ""}
                placeholder="Address (optional)"
                multiline
                onCommit={(next) => editor?.updateProfileField?.("address", next)}
              />
              {profile.address ? (
                <a href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                  Get directions
                </a>
              ) : null}
            </>
          ) : null}
        </nav>

        {activeSocials.length || profile.email ? (
          <nav aria-label="Connect">
            <h3>Connect</h3>
            {activeSocials.map(([k, label]) => (
              <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
            {profile.email ? <a href={buildEmailLink(profile.email)}>Email</a> : null}
          </nav>
        ) : null}
      </div>

      <div className="t13-container t13-footer-base">
        <span>
          © {new Date().getFullYear()} {profile.business_name}. All rights reserved.
        </span>
        <span className="t13-footer-base-end">
          <a href="https://sulvatech.com" target="_blank" rel="noreferrer">
            Developed by Sulvatech
          </a>
          <ModeToggle mode={mode} onToggle={toggleMode} className="t13-icon-btn" />
        </span>
      </div>
    </footer>
  );
}
