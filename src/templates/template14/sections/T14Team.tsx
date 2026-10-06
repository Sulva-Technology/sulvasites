"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrow } from "../icons";

/** "The studio": paper cards with a square photo, name and role. */
export default function T14Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
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
    <section className="t14-section t14-tm">
      <div className="t14-container">
        <header className="t14-sec-head t14-reveal">
          <EditableText as="h2" className="t14-h2" value={title} placeholder="The studio" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t14-sec-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t14-tm-grid" data-count={members.length}>
          {members.map((m, idx) => (
            <li key={idx} className="t14-tm-card t14-paper t14-reveal" style={{ ["--d" as string]: idx % 4 }}>
              <div className="t14-tm-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                ) : (
                  <span className="t14-tm-initials" aria-hidden="true">
                    {initials(m.name ?? "")}
                  </span>
                )}
              </div>
              <EditableText
                as="h3"
                className="t14-tm-name"
                value={m.name ?? ""}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.role || enabled ? (
                <EditableText
                  as="p"
                  className="t14-tm-role"
                  value={m.role ?? ""}
                  placeholder="Role"
                  onCommit={(next) => setItem("members", members, idx, { role: next })}
                />
              ) : null}
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t14-tm-bio"
                  value={m.bio ?? ""}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t14-tm-link" href={m.linkedinUrl} target="_blank" rel="noreferrer">
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
