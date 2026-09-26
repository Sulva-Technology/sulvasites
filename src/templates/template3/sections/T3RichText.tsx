"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { useSectionEditor } from "../edit";
import { T3Index } from "../ui";

/** Long-form text: sticky title on the left, prose on the right (first paragraph as a serif lede). */
export default function T3RichText({
  section,
  sectionIndex,
  n,
}: {
  section: RichTextSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body =
    section.body ||
    "<p>Write a clear, benefit-focused description of what you do, who you help, and what outcomes people can expect.</p>";

  return (
    <section className="t3-section">
      <div className="t3-container t3-split">
        <div className="t3-sticky t3-reveal">
          <T3Index n={n} label="Story" />
          {title || enabled ? (
            <EditableText
              as="h2"
              className="t3-title"
              value={title}
              placeholder="Section title"
              style={{ marginTop: 20 }}
              onCommit={(next) => set({ title: next })}
            />
          ) : null}
        </div>

        <div className="t3-prose t3-reveal">
          <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
        </div>
      </div>
    </section>
  );
}
