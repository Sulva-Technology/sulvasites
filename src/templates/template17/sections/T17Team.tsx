"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

/** Authors and contributors: round portraits with a short bio, like a masthead credits page. */
export default function T17Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const members = enabled
    ? section.members?.length
      ? section.members
      : [{ name: "", role: "", bio: "" }]
    : (section.members ?? []).filter((m) => m.name?.trim());
  if (members.length === 0) return null;
  return (
    <section className="t17-section">
      <div className="t17-container">
        <header className="t17-section-head t17-reveal">
          <EditableText as="h2" className="t17-h2" value={section.title || (enabled ? "" : "The people behind the words")} placeholder="Section title" onCommit={(next) => set({ title: next })} />
          {section.subtitle || enabled ? (
            <EditableText as="p" className="t17-lead" value={section.subtitle || ""} placeholder="Subtitle" multiline onCommit={(next) => set({ subtitle: next })} />
          ) : null}
        </header>
        <div className="t17-people">
          {members.map((m, i) => (
            <article key={i} className="t17-person t17-reveal">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="t17-avatar" src={m.photoUrl} alt={m.name} loading="lazy" />
              ) : (
                <span className="t17-avatar t17-avatar-initials" aria-hidden="true">
                  {initials(m.name || "?")}
                </span>
              )}
              <div>
                <EditableText as="h3" className="t17-h3" value={m.name ?? ""} placeholder="Name" onCommit={(next) => setItem("members", members, i, { name: next })} />
                <EditableText as="p" className="t17-person-role" value={m.role ?? ""} placeholder="Role" onCommit={(next) => setItem("members", members, i, { role: next })} />
                {m.bio || enabled ? (
                  <EditableText as="p" className="t17-body" value={m.bio ?? ""} placeholder="Short bio" multiline onCommit={(next) => setItem("members", members, i, { bio: next })} />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
