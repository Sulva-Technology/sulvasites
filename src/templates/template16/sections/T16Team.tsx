"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrowUpRight } from "../icons";

/** Leadership: tall rounded portraits (a profile link fades in on hover), centred name, accent role and bio. */
export default function T16Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "The people who lead us");
  const subtitle = section.subtitle || "";
  // Editor: the real members untouched (one blank card when empty). Visitors: named members only.
  const members = enabled
    ? section.members?.length
      ? section.members
      : [{ name: "", role: "", bio: "" }]
    : section.members.filter((m) => m.name?.trim());

  return (
    <section className="t16-section">
      <div className="t16-container">
        <header className="t16-center-head t16-reveal">
          <p className="t16-kicker">Leadership</p>
          <EditableText as="h2" className="t16-h2" value={title} placeholder="The people who lead us" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t16-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t16-team" data-count={members.length}>
          {members.map((m, idx) => {
            const link = m.linkedinUrl && m.linkedinUrl !== "#" ? m.linkedinUrl : "";
            return (
              <li key={idx} className="t16-member t16-reveal">
                <div className="t16-member-photo">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                  ) : (
                    <span className="t16-member-initials" aria-hidden="true">
                      {initials(m.name ?? "")}
                    </span>
                  )}
                  {link ? (
                    <span className="t16-member-shade">
                      <a className="t16-member-link" href={link} target="_blank" rel="noreferrer" aria-label={`${m.name} — profile`}>
                        <IconArrowUpRight size={16} />
                      </a>
                    </span>
                  ) : null}
                </div>
                <EditableText
                  as="h3"
                  className="t16-member-name"
                  value={m.name ?? ""}
                  placeholder="Name"
                  onCommit={(next) => setItem("members", members, idx, { name: next })}
                />
                {m.role || enabled ? (
                  <EditableText
                    as="p"
                    className="t16-member-role"
                    value={m.role ?? ""}
                    placeholder="Role"
                    onCommit={(next) => setItem("members", members, idx, { role: next })}
                  />
                ) : null}
                {m.bio || enabled ? (
                  <EditableText
                    as="p"
                    className="t16-muted t16-small t16-member-bio"
                    value={m.bio ?? ""}
                    placeholder="Short bio"
                    multiline
                    onCommit={(next) => setItem("members", members, idx, { bio: next })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
