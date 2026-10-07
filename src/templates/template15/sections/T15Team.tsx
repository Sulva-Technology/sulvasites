"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrowUpRight } from "../icons";

/** The team: tall rounded portraits with a glass name plate (name + role) and a short bio below. */
export default function T15Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "The people behind the keys");
  const subtitle = section.subtitle || "";
  // Editor: the real members untouched (one blank card when empty). Visitors: named members only.
  const members = enabled
    ? section.members?.length
      ? section.members
      : [{ name: "", role: "", bio: "" }]
    : section.members.filter((m) => m.name?.trim());

  return (
    <section className="t15-section t15-team-section">
      <div className="t15-container">
        <header className="t15-head t15-head-split t15-reveal">
          <div>
            <p className="t15-eyebrow">Team</p>
            <EditableText as="h2" className="t15-h2" value={title} placeholder="The people behind the keys" onCommit={(next) => set({ title: next })} />
          </div>
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t15-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t15-team" data-count={members.length}>
          {members.map((m, idx) => (
            <li key={idx} className="t15-member t15-reveal">
              <div className="t15-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                ) : (
                  <span className="t15-member-initials" aria-hidden="true">
                    {initials(m.name ?? "")}
                  </span>
                )}
                <div className="t15-member-plate t15-glass t15-glass-dark">
                  <EditableText
                    as="h3"
                    className="t15-member-name"
                    value={m.name ?? ""}
                    placeholder="Name"
                    onCommit={(next) => setItem("members", members, idx, { name: next })}
                  />
                  {m.role || enabled ? (
                    <EditableText
                      as="span"
                      className="t15-member-role"
                      value={m.role ?? ""}
                      placeholder="Role"
                      onCommit={(next) => setItem("members", members, idx, { role: next })}
                    />
                  ) : null}
                </div>
              </div>
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t15-muted"
                  value={m.bio ?? ""}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t15-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                  Profile <IconArrowUpRight size={14} />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
