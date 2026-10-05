"use client";

import { Fragment } from "react";

import EditableText from "@/components/inline-editor/EditableText";
import type { TestimonialsSection } from "@/lib/pageSchema";
import { useSectionEditor } from "@/templates/shared/edit";
import { initials } from "../lib";

const GRADIENTS = [
  "linear-gradient(135deg, #ffb27a, #ff7a59)",
  "linear-gradient(135deg, #a48eff, #6d5efc)",
  "linear-gradient(135deg, #7ad7ff, #3d8bff)",
  "linear-gradient(135deg, #9be7a8, #3fbf6a)",
];

/** Customer words as a chat transcript: avatar, name, bubble; every third message adds a system line. */
export default function T13Testimonials({ section, sectionIndex }: { section: TestimonialsSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.items?.some((t) => t.quote?.trim())) return null;
  const title = section.title || (enabled ? "" : "What customers say");
  const items = enabled
    ? section.items?.length
      ? section.items
      : [{ name: "", role: "", quote: "" }]
    : section.items.filter((t) => t.quote?.trim());

  return (
    <section className="t13-section t13-reviews-section">
      <div className="t13-container t13-split-grid">
        <div>
          <div className="t13-sticky t13-reveal">
            <p className="t13-label">Reviews</p>
            <EditableText as="h2" className="t13-h2" value={title} placeholder="What customers say" onCommit={(next) => set({ title: next })} />
            <p className="t13-lead">Notes from people who wear us.</p>
          </div>
        </div>
        <ol className="t13-chat">
          {items.map((t, idx) => {
            const system = idx % 3 === 2 && !!t.company?.trim();
            return (
              <Fragment key={idx}>
                <li className="t13-msg t13-reveal" style={{ ["--d" as string]: idx }}>
                  {/* Decorative initials (name is read beside it); black on the brief's gradients. */}
                  <span className="t13-msg-av" aria-hidden="true" style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>
                    {initials(t.name ?? "")}
                  </span>
                  <div className="t13-msg-main">
                    <div className="t13-msg-head">
                      {t.name || enabled ? (
                        <EditableText
                          as="span"
                          className="t13-msg-name"
                          value={t.name ?? ""}
                          placeholder="Name"
                          onCommit={(next) => setItem("items", items, idx, { name: next })}
                        />
                      ) : null}
                      {t.role || enabled || (t.company && !system) ? (
                        <span className="t13-msg-role">
                          <EditableText
                            as="span"
                            value={t.role ?? ""}
                            placeholder="City"
                            onCommit={(next) => setItem("items", items, idx, { role: next })}
                          />
                          {t.company && !system ? `${t.role ? ", " : ""}${t.company}` : null}
                        </span>
                      ) : null}
                    </div>
                    <div className="t13-msg-bubble">
                      <EditableText
                        as="blockquote"
                        value={t.quote ?? ""}
                        placeholder="What a customer said about their order."
                        multiline
                        onCommit={(next) => setItem("items", items, idx, { quote: next })}
                      />
                    </div>
                  </div>
                </li>
                {system ? (
                  <li className="t13-msg-sys t13-reveal" style={{ ["--d" as string]: idx }}>
                    <span>
                      {t.name?.trim() || "A customer"} joined from {t.company}
                    </span>
                  </li>
                ) : null}
              </Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
