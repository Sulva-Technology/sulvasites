"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

export default function T4Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "The team behind it";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "Team member",
    role: m.role || "Role",
    bio: m.bio || "",
  }));

  return (
    <section className="t4-section">
      <div className="t4-container">
        <div className="t4-head t4-reveal">
          <span className="t4-label">Team</span>
          <EditableText as="h2" className="t4-h2" value={title} placeholder="Team title" style={{ marginTop: 12 }} onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t4-lead"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              style={{ marginTop: 14 }}
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </div>
        <div className="t4-team">
          {members.map((m, idx) => (
            <article key={idx} className="t4-member t4-reveal">
              <div className="t4-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <EditableText as="h3" className="t4-h3" value={m.name} placeholder="Name" onCommit={(next) => setItem("members", members, idx, { name: next })} />
              <EditableText as="span" className="t4-muted" value={m.role} placeholder="Role" style={{ fontSize: 14 }} onCommit={(next) => setItem("members", members, idx, { role: next })} />
              {m.bio || enabled ? (
                <EditableText as="p" className="t4-muted" value={m.bio} placeholder="Short bio" multiline onCommit={(next) => setItem("members", members, idx, { bio: next })} />
              ) : null}
              {m.linkedinUrl ? (
                <a className="t4-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10, fontSize: 14 }}>
                  LinkedIn →
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
