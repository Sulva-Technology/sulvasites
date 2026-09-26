"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

/** Leadership grid with square photos and a LinkedIn badge. */
export default function T1Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Leadership team";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "Team member",
    role: m.role || "Partner",
    bio: m.bio || "",
  }));

  return (
    <section className="t1-section">
      <div className="t1-container">
        <div className="t1-head t1-reveal">
          <div>
            <span className="t1-over">Our people</span>
            <EditableText as="h2" className="t1-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          </div>
          {subtitle || enabled ? (
            <EditableText as="p" className="t1-lead" value={subtitle} placeholder="Subtitle (optional)" multiline onCommit={(next) => set({ subtitle: next })} />
          ) : (
            <span />
          )}
        </div>
        <div className="t1-team">
          {members.map((m, idx) => (
            <article key={idx} className="t1-member t1-reveal">
              <div className="t1-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
                {m.linkedinUrl ? (
                  <a className="t1-member-in" href={m.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`${m.name} on LinkedIn`}>
                    in
                  </a>
                ) : null}
              </div>
              <EditableText as="h3" className="t1-h3" value={m.name} placeholder="Name" onCommit={(next) => setItem("members", members, idx, { name: next })} />
              <EditableText as="span" className="t1-mono t1-muted" value={m.role} placeholder="Role" onCommit={(next) => setItem("members", members, idx, { role: next })} />
              {m.bio || enabled ? (
                <EditableText as="p" className="t1-muted" value={m.bio} placeholder="Short bio" multiline onCommit={(next) => setItem("members", members, idx, { bio: next })} />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
