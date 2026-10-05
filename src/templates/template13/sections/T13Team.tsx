"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** "The studio": graded portrait cards with a serif name and mono role. */
export default function T13Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "The studio");
  const subtitle = section.subtitle || "";
  const members = enabled
    ? section.members?.length
      ? section.members
      : [{ name: "", role: "", bio: "" }]
    : section.members.filter((m) => m.name?.trim());

  return (
    <section className="t13-section t13-team-section">
      <div className="t13-container">
        <header className="t13-sec-head t13-reveal">
          <div>
            <p className="t13-label">Team</p>
            <EditableText as="h2" className="t13-h2" value={title} placeholder="The studio" onCommit={(next) => set({ title: next })} />
          </div>
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t13-sec-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t13-team" data-count={members.length}>
          {members.map((m, idx) => (
            <li key={idx} className="t13-member t13-reveal">
              <div className="t13-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                ) : (
                  <span className="t13-member-initials" aria-hidden="true">
                    {initials(m.name ?? "")}
                  </span>
                )}
              </div>
              <EditableText
                as="h3"
                className="t13-member-name"
                value={m.name ?? ""}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.role || enabled ? (
                <EditableText
                  as="p"
                  className="t13-member-role"
                  value={m.role ?? ""}
                  placeholder="Role"
                  onCommit={(next) => setItem("members", members, idx, { role: next })}
                />
              ) : null}
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t13-muted"
                  value={m.bio ?? ""}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t13-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                  Profile <IconArrow size={14} />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
