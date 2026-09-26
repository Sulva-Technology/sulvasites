"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** Team as "Meet your agents" cards. */
export default function T6Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "Meet your agents";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "Agent name",
    role: m.role || "Property advisor",
    bio: m.bio || "",
  }));

  return (
    <section className="t6-section">
      <div className="t6-container">
        <div className="t6-head t6-reveal">
          <div>
            <span className="t6-kicker">Our team</span>
            <EditableText as="h2" className="t6-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
            {subtitle || enabled ? (
              <EditableText
                as="p"
                className="t6-lead"
                value={subtitle}
                placeholder="Subtitle (optional)"
                multiline
                onCommit={(next) => set({ subtitle: next })}
              />
            ) : null}
          </div>
        </div>

        <div className="t6-agents">
          {members.map((m, idx) => (
            <article key={idx} className="t6-agent t6-reveal">
              <div className="t6-agent-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <EditableText
                as="h3"
                className="t6-h3"
                value={m.name}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              <EditableText
                as="span"
                className="t6-muted"
                value={m.role}
                placeholder="Role"
                style={{ fontSize: 14, fontWeight: 500 }}
                onCommit={(next) => setItem("members", members, idx, { role: next })}
              />
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t6-muted"
                  value={m.bio}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl ? (
                <a className="t6-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
                  LinkedIn <IconArrow size={16} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
