"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ServicesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { planHref, useT11 } from "../ctx";
import { Barcode, IconArrow, IconSparkle } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Package name", desc: "What's included — planning, styling, catering, entertainment." },
  { title: "Another package", desc: "Who it suits and how the day runs." },
  { title: "Third package", desc: "Keep it short and festive." },
];

const TONES = ["violet", "peach", "plum"] as const;

/**
 * Event packages as ticket stubs: a numbered top with title and description, a perforated
 * tear line with punched notches, and a stub with "Enquire" (prefills the enquiry form).
 */
export default function T11Services({ section, sectionIndex }: { section: ServicesSection; sectionIndex?: number }) {
  const ctx = useT11();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));

  return (
    <section id="packages" className="t11-section t11-packages-section">
      <div className="t11-container">
        <header className="t11-head t11-head-center t11-reveal">
          <span className="t11-kicker">Packages</span>
          <h2 className="t11-h2">
            Pick your <span className="t11-hl">package</span>
          </h2>
          <p className="t11-head-note">Choose a package to start an enquiry, or tell us about your idea and we&apos;ll shape one around it.</p>
        </header>

        <div className="t11-packages" data-count={items.length}>
          {items.map((it, idx) => (
            <article key={idx} className="t11-pass t11-reveal" data-tone={TONES[idx % TONES.length]}>
              <div className="t11-pass-main">
                <div className="t11-pass-top">
                  <span className="t11-pass-no">No. {pad2(idx + 1)}</span>
                  <span className="t11-pass-ico" aria-hidden="true">
                    <IconSparkle size={16} />
                  </span>
                </div>
                <EditableText
                  as="h3"
                  className="t11-pass-title"
                  value={it.title}
                  placeholder={HINTS[idx % HINTS.length].title}
                  onCommit={(next) => setItem("items", items, idx, { title: next })}
                />
                {it.desc || enabled ? (
                  <EditableText
                    as="p"
                    className="t11-pass-desc"
                    value={it.desc}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                ) : null}
              </div>
              <div className="t11-pass-tear" aria-hidden="true" />
              <div className="t11-pass-stub">
                <Barcode className="t11-pass-code" />
                <a
                  className="t11-pass-link"
                  href={planHref(ctx, { service: it.title })}
                  aria-label={`Enquire about ${it.title || "this package"}`}
                >
                  Enquire <IconArrow size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
