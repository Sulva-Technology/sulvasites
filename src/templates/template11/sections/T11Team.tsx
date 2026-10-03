"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrowUpRight } from "../icons";

const TONES = ["violet", "peach", "rose", "plum"] as const;

/** "The crew": round portraits in gradient rings, a tilted role sticker, name and a short bio. */
export default function T11Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "Meet the crew");
  const subtitle = section.subtitle || "";
  const source = enabled ? section.members : section.members?.filter((m) => m.name?.trim());
  const members = (source?.length ? source : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "",
    role: m.role || "",
    bio: m.bio || "",
  }));

  return (
    <section className="t11-section t11-crew-section">
      <div className="t11-container">
        <header className="t11-head t11-head-center t11-reveal">
          <span className="t11-kicker">The crew</span>
          <EditableText as="h2" className="t11-h2" value={title} placeholder="Meet the crew" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t11-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <ul className="t11-crew" data-count={members.length}>
          {members.map((m, idx) => (
            <li key={idx} className="t11-member t11-reveal" data-tone={TONES[idx % TONES.length]}>
              <div className="t11-member-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Team member"} loading="lazy" />
                ) : (
                  <span className="t11-member-initials" aria-hidden="true">
                    {initials(m.name)}
                  </span>
                )}
                {m.role || enabled ? (
                  <EditableText
                    as="span"
                    className="t11-member-role"
                    value={m.role}
                    placeholder="Role"
                    onCommit={(next) => setItem("members", members, idx, { role: next })}
                  />
                ) : null}
              </div>
              <EditableText
                as="h3"
                className="t11-member-name"
                value={m.name}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t11-member-bio"
                  value={m.bio}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t11-textlink t11-member-link" href={m.linkedinUrl} target="_blank" rel="noreferrer">
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
