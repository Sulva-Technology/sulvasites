"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** "The crew": square portraits with an orange role plate, name and a short bio. */
export default function T12Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "Meet the crew");
  const subtitle = section.subtitle || "";
  // Editor: the real members untouched (one blank card when empty). Visitors: named members only.
  const members = enabled
    ? section.members?.length
      ? section.members
      : [{ name: "", role: "", bio: "" }]
    : section.members.filter((m) => m.name?.trim());

  return (
    <section className="t12-section t12-crew-section">
      <div className="t12-container">
        <header className="t12-head t12-head-split t12-reveal">
          <div>
            <p className="t12-label t12-kicker">
              <span className="t12-kicker-sq" aria-hidden="true" /> The crew
            </p>
            <EditableText as="h2" className="t12-h2" value={title} placeholder="Meet the crew" onCommit={(next) => set({ title: next })} />
          </div>
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t12-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t12-crew" data-count={members.length}>
          {members.map((m, idx) => (
            <li key={idx} className="t12-member t12-reveal">
              <div className="t12-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                ) : (
                  <span className="t12-member-initials" aria-hidden="true">
                    {initials(m.name ?? "")}
                  </span>
                )}
                {m.role || enabled ? (
                  <EditableText
                    as="span"
                    className="t12-member-role"
                    value={m.role ?? ""}
                    placeholder="Role / trade"
                    onCommit={(next) => setItem("members", members, idx, { role: next })}
                  />
                ) : null}
              </div>
              <EditableText
                as="h3"
                className="t12-member-name"
                value={m.name ?? ""}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t12-muted"
                  value={m.bio ?? ""}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t12-textlink" href={m.linkedinUrl} target="_blank" rel="noreferrer">
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
