"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow, Ornament } from "../icons";

/** The people behind the pass: arched portraits with serif names. */
export default function T7Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || "The people behind the pass";
  const subtitle = section.subtitle || "";
  const source = enabled ? section.members : section.members?.filter((m) => m.name?.trim());
  const members = (source?.length ? source : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "",
    role: m.role || "",
    bio: m.bio || "",
  }));

  return (
    <section className="t7-section t7-team-section">
      <div className="t7-container">
        <header className="t7-head t7-head-center t7-reveal">
          <span className="t7-rule-label">
            <i aria-hidden="true" />
            <span>The team</span>
            <i aria-hidden="true" />
          </span>
          <EditableText as="h2" className="t7-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t7-lead"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <div className="t7-team" data-count={Math.min(members.length, 4)}>
          {members.map((m, idx) => (
            <article key={idx} className="t7-member t7-reveal">
              <div className="t7-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              {m.role || enabled ? (
                <span className="t7-member-role">
                  <Ornament size={8} />
                  <EditableText
                    as="span"
                    value={m.role}
                    placeholder="Role"
                    onCommit={(next) => setItem("members", members, idx, { role: next })}
                  />
                </span>
              ) : null}
              <EditableText
                as="h3"
                className="t7-h3"
                value={m.name}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t7-muted"
                  value={m.bio}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t7-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn <IconArrow size={14} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
