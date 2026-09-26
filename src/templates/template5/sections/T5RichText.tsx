"use client";

import EditableHtml from "@/components/inline-editor/EditableHtml";
import EditableText from "@/components/inline-editor/EditableText";
import type { RichTextSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { useT5 } from "../ctx";

/** "Meet the artist": arched photo beside the story, signed with the business name. */
export default function T5RichText({ section, sectionIndex }: { section: RichTextSection; sectionIndex?: number }) {
  const { photos, profile } = useT5();
  const { enabled, set } = useSectionEditor(section, sectionIndex);
  const title = section.title || "";
  const body =
    section.body ||
    "<p>Tell your story: how you started, what you love about this work and how you want clients to feel.</p>";
  const photo = photos[2] ?? photos[0];

  return (
    <section className="t5-section">
      <div className="t5-container t5-story">
        <div className="t5-arch t5-reveal" aria-hidden="true">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" />
          ) : (
            <span className="t5-monogram">{initials(profile.business_name)}</span>
          )}
        </div>
        <div className="t5-reveal" style={{ display: "grid", gap: 20 }}>
          <span className="t5-eyebrow">Our story</span>
          {title || enabled ? (
            <EditableText as="h2" className="t5-title" value={title} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          ) : null}
          <div className="t5-prose">
            <EditableHtml html={body} onCommit={(nextHtml) => set({ body: nextHtml })} />
          </div>
          <div className="t5-signature">— {profile.business_name}</div>
        </div>
      </div>
    </section>
  );
}
