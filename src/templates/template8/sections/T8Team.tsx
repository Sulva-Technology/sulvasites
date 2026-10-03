"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** Doctors and clinicians as rounded cards: portrait, role chip, name and short bio. */
export default function T8Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || "Meet our team";
  const subtitle = section.subtitle || "";
  const source = enabled ? section.members : section.members?.filter((m) => m.name?.trim());
  const members = (source?.length ? source : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "",
    role: m.role || "",
    bio: m.bio || "",
  }));

  return (
    <section className="t8-section t8-team-section">
      <div className="t8-container">
        <header className="t8-head t8-head-center t8-reveal">
          <span className="t8-eyebrow">Our team</span>
          <EditableText as="h2" className="t8-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t8-lead"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <div className="t8-team" data-count={Math.min(members.length, 4)}>
          {members.map((m, idx) => (
            <article key={idx} className="t8-doctor t8-reveal">
              <div className="t8-doctor-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <div className="t8-doctor-body">
                {m.role || enabled ? (
                  <EditableText
                    as="span"
                    className="t8-chip"
                    value={m.role}
                    placeholder="Role / specialty"
                    onCommit={(next) => setItem("members", members, idx, { role: next })}
                  />
                ) : null}
                <EditableText
                  as="h3"
                  className="t8-h3"
                  value={m.name}
                  placeholder="Name"
                  onCommit={(next) => setItem("members", members, idx, { name: next })}
                />
                {m.bio || enabled ? (
                  <EditableText
                    as="p"
                    className="t8-muted"
                    value={m.bio}
                    placeholder="Short bio"
                    multiline
                    onCommit={(next) => setItem("members", members, idx, { bio: next })}
                  />
                ) : null}
                {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                  <a className="t8-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                    LinkedIn <IconArrow size={14} />
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
