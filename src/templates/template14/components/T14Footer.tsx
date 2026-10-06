"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { buildEmailLink, buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { directionsHref, shopHref, useT14 } from "../ctx";
import T14Hours from "./T14Hours";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["twitter", "X"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
];

/** Quiet footer: wordmark, tagline, shop search and a mode chip, then Explore, Shop, Help and Follow columns. */
export default function T14Footer({ logoUrl }: { logoUrl: string | null }) {
  const { baseUrl, navPages, profile, hours, shop, mode, toggleMode } = useT14();
  const editor = useInlineEditor();
  const router = useRouter();
  const [q, setQ] = useState("");
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);
  const deliveryPage = navPages.find((p) => /deliver|shipping/i.test(p.label));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(`${shopHref(baseUrl)}${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  };

  const hasHelp = Boolean(profile.address || profile.phone || profile.email || profile.whatsapp || deliveryPage);

  return (
    <footer className="t14-footer">
      <div className="t14-container">
        <div className="t14-footer-grid">
          <div className="t14-footer-brand">
            <Link href={`${baseUrl}/`} className="t14-footer-name" aria-label={`${profile.business_name} home`}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={profile.business_name} />
              ) : (
                profile.business_name
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
            {shop ? (
              <form className="t14-footer-search" role="search" onSubmit={submit}>
                <label htmlFor="t14-footer-q" className="t14-sr">
                  Search the shop
                </label>
                <input
                  id="t14-footer-q"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Search products"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button type="submit" className="t14-pill t14-pill-black">
                  Search
                </button>
              </form>
            ) : null}
            <button type="button" className="t14-chip t14-modechip" onClick={toggleMode}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>

          <div>
            <p className="t14-footer-h">Explore</p>
            <div className="t14-footer-links">
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

          {shop ? (
            <div>
              <p className="t14-footer-h">Shop</p>
              <div className="t14-footer-links">
                <Link href={shopHref(baseUrl)}>All products</Link>
                {shop.categories.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`${baseUrl}/shop/c/${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {hasHelp || hours.length || editor?.enabled ? (
            <div>
              <p className="t14-footer-h">Help</p>
              <div className="t14-footer-links">
                {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
                {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
                {profile.whatsapp ? (
                  <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {deliveryPage ? <Link href={`${baseUrl}/p/${deliveryPage.key}`}>{deliveryPage.label}</Link> : null}
                {profile.address ? (
                  <>
                    <EditableText
                      as="span"
                      value={profile.address}
                      multiline
                      onCommit={(next) => editor?.updateProfileField?.("address", next)}
                    />
                    <a className="t14-footer-accent" href={directionsHref(profile.address)} target="_blank" rel="noreferrer">
                      Get directions
                    </a>
                  </>
                ) : null}
              </div>
              {hours.length || editor?.enabled ? (
                <div className="t14-footer-hours">
                  <p className="t14-footer-h">Opening hours</p>
                  <T14Hours className="t14-hours-footer" />
                </div>
              ) : null}
            </div>
          ) : null}

          {activeSocials.length ? (
            <div>
              <p className="t14-footer-h">Follow</p>
              <div className="t14-footer-links">
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={socials[k] as string} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="t14-footer-bar">
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
