"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";

/** Team as a magazine "contributors" list. */
export default function T2Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Contributors";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "Contributor",
    role: m.role || "Role",
    bio: m.bio || "",
  }));

  return (
    <section className="t2-section t2-section-rule">
      <div className="t2-container">
        <div className="t2-head t2-reveal">
          <div>
            <span className="t2-kicker">Masthead</span>
            <EditableText as="h2" className="t2-title" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
            {subtitle || enabled ? (
              <EditableText as="p" className="t2-deck" value={subtitle} placeholder="Subtitle (optional)" multiline onCommit={(next) => set({ subtitle: next })} />
            ) : null}
          </div>
        </div>
        <div className="t2-contributors">
          {members.map((m, idx) => (
            <article key={idx} className="t2-contributor t2-reveal">
              <div className="t2-portrait">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <div>
                <EditableText as="h3" className="t2-h3" value={m.name} placeholder="Name" style={{ fontSize: "1.45rem" }} onCommit={(next) => setItem("members", members, idx, { name: next })} />
                <EditableText as="span" className="t2-meta" value={m.role} placeholder="Role" onCommit={(next) => setItem("members", members, idx, { role: next })} />
                {m.bio || enabled ? (
                  <EditableText as="p" className="t2-muted" value={m.bio} placeholder="Short bio" multiline onCommit={(next) => setItem("members", members, idx, { bio: next })} />
                ) : null}
                {m.linkedinUrl ? (
                  <a className="t2-read" href={m.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                    Profile →
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
