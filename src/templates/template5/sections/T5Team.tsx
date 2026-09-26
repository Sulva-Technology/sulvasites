"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

/** Artists with arched portraits. */
export default function T5Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Meet the artists";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "Artist name",
    role: m.role || "Makeup artist",
    bio: m.bio || "",
  }));

  return (
    <section className="t5-section">
      <div className="t5-container">
        <div className="t5-head t5-center t5-reveal">
          <span className="t5-eyebrow">The team</span>
          <EditableText as="h2" className="t5-title" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText as="p" className="t5-lead" value={subtitle} placeholder="Subtitle (optional)" multiline onCommit={(next) => set({ subtitle: next })} />
          ) : null}
        </div>
        <div className="t5-team">
          {members.map((m, idx) => (
            <article key={idx} className="t5-member t5-reveal">
              <div className="t5-arch">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <EditableText as="h3" className="t5-h3" value={m.name} placeholder="Name" onCommit={(next) => setItem("members", members, idx, { name: next })} />
              <EditableText as="span" className="t5-role" value={m.role} placeholder="Role" onCommit={(next) => setItem("members", members, idx, { role: next })} />
              {m.bio || enabled ? (
                <EditableText as="p" className="t5-muted" value={m.bio} placeholder="Short bio" multiline onCommit={(next) => setItem("members", members, idx, { bio: next })} />
              ) : null}
              {m.linkedinUrl ? (
                <a className="t5-link" href={m.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                  Profile ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
