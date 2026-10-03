"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { ValuesSection } from "@/lib/pageSchema";
import { pad2, useSectionEditor } from "@/templates/shared/edit";
import { joinHref, useT9 } from "../ctx";
import { IconArrow, IconCheck } from "../icons";

// Placeholder hints shown on empty fields while editing (never saved).
const HINTS = [
  { title: "Plan name", desc: "What's included and who it's for." },
  { title: "Another plan", desc: "How often members train, what they get." },
  { title: "Third plan", desc: "Keep each plan short and concrete." },
];

/** The highlighted plan: the middle card (second of two, none for a single plan). */
function featuredIndex(n: number) {
  if (n < 2) return -1;
  if (n === 2) return 1;
  return Math.floor((n - 1) / 2);
}

/** Values as membership plan cards — title, description and a "Choose plan" button; the middle card is highlighted. */
export default function T9Values({ section, sectionIndex }: { section: ValuesSection; sectionIndex?: number }) {
  const ctx = useT9();
  const { enabled, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((it) => it.title?.trim())) return null;
  // Editor: the real items (one blank card when empty). Visitors: titled items only.
  const items = enabled
    ? (section.items?.length ? section.items : [{ title: "", desc: "" }]).map((it) => ({
        title: it.title || "",
        desc: it.desc || "",
      }))
    : section.items.filter((it) => it.title?.trim()).map((it) => ({ title: it.title.trim(), desc: it.desc || "" }));
  const featured = featuredIndex(items.length);

  return (
    <section className="t9-section t9-plans-section t9-tint">
      <div className="t9-container">
        <header className="t9-head t9-head-center t9-reveal">
          <span className="t9-kicker t9-kicker-dark">Membership</span>
          <h2 className="t9-h2">
            Choose your <em>plan</em>
          </h2>
        </header>

        <div className="t9-plans" data-count={Math.min(items.length, 4)}>
          {items.map((it, idx) => (
            <article key={idx} className="t9-plan t9-reveal" data-featured={idx === featured}>
              <span className="t9-plan-no">Plan {pad2(idx + 1)}</span>
              <EditableText
                as="h3"
                className="t9-plan-title"
                value={it.title}
                placeholder={HINTS[idx % HINTS.length].title}
                onCommit={(next) => setItem("items", items, idx, { title: next })}
              />
              <span className="t9-plan-rule" aria-hidden="true" />
              {it.desc || enabled ? (
                <div className="t9-plan-desc">
                  <span className="t9-plan-check" aria-hidden="true">
                    <IconCheck size={14} />
                  </span>
                  <EditableText
                    as="p"
                    value={it.desc}
                    placeholder={HINTS[idx % HINTS.length].desc}
                    multiline
                    onCommit={(next) => setItem("items", items, idx, { desc: next })}
                  />
                </div>
              ) : null}
              <a
                className={idx === featured ? "t9-btn t9-btn-block" : "t9-btn t9-btn-ink t9-btn-block"}
                href={joinHref(ctx, it.title)}
                aria-label={`Choose plan: ${it.title || "plan"}`}
              >
                Choose plan <IconArrow size={16} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
