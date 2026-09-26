"use client";

import { useEffect, useState, type FormEvent } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { propertiesHref, useT6 } from "../ctx";
import { IconArrow } from "../icons";

const MODES = ["Buy", "Rent", "Sell"] as const;
const TYPES = ["Any type", "Apartment", "Terrace", "Duplex", "Detached house", "Land", "Commercial"];
const BUDGETS = ["Any budget", "Entry level", "Mid range", "Premium", "Luxury"];

/** Line drawing of a skyline, shown when the site has no photos yet. */
function Blueprint() {
  return (
    <div className="t6-hero-blueprint" aria-hidden="true">
      <svg viewBox="0 0 800 420" fill="none" stroke="#fff" strokeWidth="1.4">
        <path d="M0 420V300h90v120M90 420V220h120v200M210 420V140l90-60 90 60v280M390 420V250h110v170M500 420V180h140v240M640 420V270h160v150" />
        <path d="M240 170h120M240 210h120M240 250h120M240 290h120M240 330h120M530 210h80M530 250h80M530 290h80M530 330h80M120 250h60M120 290h60M120 330h60M410 280h70M410 320h70M670 300h100M670 340h100" />
      </svg>
    </div>
  );
}

export default function T6Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  /** First hero on the page: full frame with search. Later heroes render compact. */
  primary?: boolean;
}) {
  const ctx = useT6();
  const { photos, profile } = ctx;
  const { set } = useSectionEditor(section, sectionIndex);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<(typeof MODES)[number]>("Buy");

  const headline = section.headline || "Find a home that fits the life you want";
  const subtext =
    section.subtext ||
    `${profile.business_name} helps you buy, sell and rent with verified listings, honest advice and a team that knows every neighbourhood.`;
  const ctaText = section.ctaText || "Browse properties";
  const slides = photos.slice(0, 4);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = window.setInterval(() => setActive((v) => (v + 1) % slides.length), 6000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams({ interest: mode });
    for (const k of ["location", "type", "budget"]) {
      const v = String(data.get(k) || "");
      if (v && !v.startsWith("Any")) params.set(k, v);
    }
    window.location.href = `${propertiesHref(ctx)}?${params.toString()}`;
  }

  return (
    <section className="t6-hero">
      <div className="t6-hero-frame" style={primary ? undefined : { minHeight: "min(56svh, 560px)" }}>
        {slides.length ? (
          <div className="t6-hero-media" aria-hidden="true">
            {slides.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.url} src={s.url} alt="" data-active={i === active} />
            ))}
          </div>
        ) : (
          <Blueprint />
        )}

        {slides.length > 1 ? (
          <div className="t6-hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.url}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        ) : null}

        <div className="t6-hero-content">
          {primary ? (
            <span className="t6-hero-tag">
              <b>{profile.business_name}</b>
              <span className="t6-hero-tag-text">Buy · Rent · Sell · Invest</span>
            </span>
          ) : null}
          <EditableText
            as="h1"
            className="t6-h1"
            value={headline}
            placeholder="Hero headline"
            multiline
            onCommit={(next) => set({ headline: next })}
          />
          <EditableText
            as="p"
            className="t6-lead"
            value={subtext}
            placeholder="Hero subtext"
            multiline
            onCommit={(next) => set({ subtext: next })}
          />
          <div className="t6-hero-actions">
            <a className="t6-btn" href={section.ctaHref || propertiesHref(ctx)}>
              <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
              <IconArrow />
            </a>
            <a className="t6-btn t6-btn-glass" href={`${ctx.baseUrl}/contact`}>
              Book a private viewing
            </a>
          </div>
        </div>

        {primary ? (
          <form className="t6-search" onSubmit={onSearch} aria-label="Search properties">
            <div className="t6-search-tabs" role="group" aria-label="I want to">
              {MODES.map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m}
                </button>
              ))}
            </div>
            <div className="t6-search-fields">
              <label className="t6-search-field">
                <span>Location</span>
                <input name="location" placeholder="Area, district or city" />
              </label>
              <label className="t6-search-field">
                <span>Property type</span>
                <select name="type" defaultValue={TYPES[0]}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="t6-search-field">
                <span>Budget</span>
                <select name="budget" defaultValue={BUDGETS[0]}>
                  {BUDGETS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="t6-btn">
                Search <IconArrow />
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
