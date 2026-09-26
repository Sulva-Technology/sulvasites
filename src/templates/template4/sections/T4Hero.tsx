"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { HeroSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { useT4 } from "../ctx";
import { FEATURE_ICONS, IconArrow, IconCheck } from "../icons";

function splitLastWord(text: string): [string, string] {
  const t = text.trim();
  const i = t.lastIndexOf(" ");
  return i === -1 ? ["", t] : [t.slice(0, i), t.slice(i + 1)];
}

const BARS = [38, 52, 44, 66, 58, 74, 62, 86, 70, 92, 80, 96];

/** Centered hero with a product stage: browser "dashboard" + phone listing the site's features. */
export default function T4Hero({
  section,
  sectionIndex,
  primary,
}: {
  section: HeroSection;
  sectionIndex?: number;
  primary?: boolean;
}) {
  const { baseUrl, photos, featureNames, profile } = useT4();
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const headline = section.headline || "The simpler way to get it done";
  const subtext =
    section.subtext ||
    "Everything you need in one place — set up in minutes, loved by the people who use it every day.";
  const ctaText = section.ctaText || "Get started";
  const [head, tail] = splitLastWord(headline);
  const features = (featureNames.length ? featureNames : ["Fast setup", "Smart reminders", "Live tracking", "Secure payments"]).slice(0, 4);
  const shot = photos[0];

  return (
    <section className="t4-hero" style={primary ? undefined : { paddingBottom: 80 }}>
      <div className="t4-container">
        <div className="t4-hero-copy t4-reveal">
          <span className="t4-badge">
            <b>New</b> {profile.tagline || `Introducing ${profile.business_name}`}
          </span>
          {enabled ? (
            <EditableText
              as="h1"
              className="t4-h1"
              value={headline}
              placeholder="Hero headline"
              multiline
              onCommit={(next) => set({ headline: next })}
            />
          ) : (
            <h1 className="t4-h1">
              {head ? `${head} ` : null}
              <span className="t4-mark">{tail}</span>
            </h1>
          )}
          <EditableText
            as="p"
            className="t4-lead"
            value={subtext}
            placeholder="Hero subtext"
            multiline
            onCommit={(next) => set({ subtext: next })}
          />
          <div className="t4-hero-actions">
            <a className="t4-btn t4-btn-accent" href={section.ctaHref || `${baseUrl}/contact`}>
              <EditableText as="span" value={ctaText} placeholder="CTA" onCommit={(next) => set({ ctaText: next })} />
              <IconArrow />
            </a>
            <a className="t4-btn t4-btn-light" href="#features">
              See how it works
            </a>
          </div>
          {primary ? (
            <div className="t4-hero-meta">
              {["Quick to set up", "Friendly support", "No surprises"].map((t) => (
                <span key={t}>
                  <IconCheck /> {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {primary ? (
          <div className="t4-stage t4-reveal" aria-hidden="true">
            <div className="t4-screen">
              <div className="t4-screen-bar">
                <i />
                <i />
                <i />
                <span>{profile.business_name.toLowerCase().replace(/\s+/g, "")}.app</span>
              </div>
              {shot ? (
                <div className="t4-screen-body">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.url} alt="" />
                </div>
              ) : (
                <div className="t4-dash">
                  <div className="t4-dash-side">
                    {Array.from({ length: 7 }, (_, i) => (
                      <i key={i} style={{ width: `${50 + ((i * 17) % 45)}%` }} />
                    ))}
                  </div>
                  <div className="t4-dash-main">
                    {features.slice(0, 3).map((f, i) => (
                      <div key={f} className="t4-kpi">
                        <small>{f}</small>
                        <b>{["98%", "2.4k", "12m"][i]}</b>
                      </div>
                    ))}
                    <div className="t4-chart">
                      {BARS.map((h, i) => (
                        <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="t4-phone">
              <div className="t4-phone-screen">
                <div className="t4-phone-title">{profile.business_name}</div>
                {features.map((f, i) => {
                  const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                  return (
                    <div key={f} className="t4-phone-card">
                      <i>
                        <Icon size={15} />
                      </i>
                      {f}
                      <em />
                    </div>
                  );
                })}
                <div className="t4-phone-cta">{ctaText}</div>
              </div>
            </div>

            <div className="t4-float">
              <i>
                <IconCheck size={18} />
              </i>
              <span>
                All set!
                <small>Ready in under 5 minutes</small>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
