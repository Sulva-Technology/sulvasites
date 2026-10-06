"use client";

import Link from "next/link";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { buildTelLink, buildWhatsAppLink } from "@/templates/shared/links";
import { shopHref, useT14 } from "../ctx";
import { IconArrow } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Service name", desc: "What it includes and who it is for." },
  { title: "Another service", desc: "Keep it short and specific." },
  { title: "Third service", desc: "One or two short sentences." },
];

/** Instagram handle or URL from the profile socials, as a link. */
function instagramHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
}

/** Services as "How it works": numbered paper cards, each with a photo tile, then the ways to order. */
export default function T14Services({
  section,
  sectionIndex,
  anchor,
}: {
  section: ServicesSection;
  sectionIndex?: number;
  anchor?: boolean;
}) {
  const { photos, profile, shop, baseUrl } = useT14();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items untouched (one blank row when empty). Visitors: titled items only.
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ title: "", desc: "" }]
    : section.items.filter((it) => it.title?.trim());

  const social = (profile.socials || {}) as Record<string, unknown>;
  const channels: Array<{ label: string; href: string; external: boolean }> = [];
  if (profile.whatsapp) channels.push({ label: "WhatsApp", href: buildWhatsAppLink(profile.whatsapp), external: true });
  if (profile.phone) channels.push({ label: "Phone", href: buildTelLink(profile.phone), external: false });
  const ig = instagramHref(social.instagram);
  if (ig) channels.push({ label: "Instagram", href: ig, external: true });
  const live = !!shop && shop.products.length > 0;

  return (
    <section id={anchor ? "services" : undefined} className="t14-section t14-how">
      <div className="t14-container">
        <header className="t14-how-head t14-reveal">
          <h2 className="t14-h2">How it works.</h2>
          {live ? (
            <p className="t14-lead">{items.length === 3 ? "Three steps from browsing to your door." : "From browsing to your door."}</p>
          ) : null}
        </header>

        <ol className="t14-how-grid">
          {items.map((it, idx) => {
            const photo = photos.length ? photos[idx % photos.length] : null;
            return (
              <li key={idx} className="t14-how-card t14-paper t14-reveal" style={{ ["--d" as string]: idx % 3 }}>
                <span className="t14-how-no" aria-hidden="true">
                  {idx + 1}
                </span>
                <EditableText
                  as="h3"
                  className="t14-how-title"
                  value={it.title ?? ""}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t14-how-desc"
                    value={it.desc ?? ""}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
                <div className="t14-how-tile" data-photo={!!photo} aria-hidden="true">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt="" loading="lazy" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {channels.length > 0 || live ? (
          <div className="t14-how-foot t14-reveal">
            {channels.length > 0 ? (
              <div className="t14-how-row">
                <span className="t14-how-or">Or order by</span>
                {channels.map((c) => (
                  <a
                    key={c.label}
                    className="t14-chip t14-how-chip"
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            ) : null}
            {live ? (
              <Link className="t14-pill t14-pill-black t14-pill-lg" href={shopHref(baseUrl)}>
                Start shopping <IconArrow size={16} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
