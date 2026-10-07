"use client";

import Link from "next/link";

import { buildEmailLink, buildTelLink, buildWhatsAppLink, navPageHref } from "@/templates/shared/links";
import { blogHref, firstName, SUBSCRIBE_ID, useT17 } from "../ctx";
import { IconRss } from "../icons";
import T17Subscribe from "./T17Subscribe";
import { T17Wordmark } from "./T17Header";

const SOCIALS: Array<[key: string, label: string]> = [
  ["instagram", "Instagram"],
  ["twitter", "X"],
  ["linkedin", "LinkedIn"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
];

/** The ink-dark subscribe band on every page, then a quiet footer: wordmark, links, contact, socials. */
export default function T17Footer({ logoUrl }: { logoUrl: string | null }) {
  const ctx = useT17();
  const { baseUrl, navPages, profile, blog } = ctx;
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const navLabels = (socials.nav_labels as Record<string, string>) || {};
  const activeSocials = SOCIALS.filter(([k]) => typeof socials[k] === "string" && socials[k]);
  const name = profile.business_name;
  const year = new Date().getFullYear();

  return (
    <>
      <section id={SUBSCRIBE_ID} className="t17-band">
        <div className="t17-container t17-band-in t17-reveal">
          <div>
            <p className="t17-kicker t17-kicker-band">The newsletter</p>
            <h2 className="t17-band-title">
              New writing from {firstName(name)}, <em>straight to your inbox.</em>
            </h2>
            <p className="t17-band-lead">No spam, no noise. Just new posts when they&apos;re ready. Unsubscribe any time.</p>
          </div>
          <T17Subscribe tone="dark" />
        </div>
      </section>

      <footer className="t17-footer">
        <div className="t17-container">
          <div className="t17-footer-grid">
            <div className="t17-footer-brand">
              <Link href={`${baseUrl}/`} aria-label={name}>
                <T17Wordmark logoUrl={logoUrl} name={name} />
              </Link>
              {profile.description ? <p>{profile.description}</p> : null}
            </div>
            <nav className="t17-footer-col" aria-label="Footer">
              <h3>Read</h3>
              <Link href={`${baseUrl}/`}>{navLabels.home || "Home"}</Link>
              {navPages.map((p) => (
                <Link key={p.key} href={navPageHref(baseUrl, p)}>
                  {p.label}
                </Link>
              ))}
              <Link href={`${baseUrl}/about`}>{navLabels.about || "About"}</Link>
              <Link href={`${baseUrl}/contact`}>{navLabels.contact || "Contact"}</Link>
            </nav>
            <div className="t17-footer-col">
              <h3>Get in touch</h3>
              {profile.email ? <a href={buildEmailLink(profile.email)}>{profile.email}</a> : null}
              {profile.phone ? <a href={buildTelLink(profile.phone)}>{profile.phone}</a> : null}
              {profile.whatsapp ? (
                <a href={buildWhatsAppLink(profile.whatsapp)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              ) : null}
              {profile.address ? <span>{profile.address}</span> : null}
            </div>
            {activeSocials.length > 0 || blog ? (
              <div className="t17-footer-col">
                <h3>Follow</h3>
                {activeSocials.map(([k, label]) => (
                  <a key={k} href={String(socials[k])} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
                {blog ? (
                  <a href={`${blogHref(ctx)}/feed.xml`} className="t17-rss">
                    <IconRss size={14} /> RSS feed
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="t17-footer-base">
            <span>
              © {year} {name}
            </span>
            <a href="#top" className="t17-totop">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
