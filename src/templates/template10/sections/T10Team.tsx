"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "@/templates/shared/edit";
import { IconArrowUpRight } from "../icons";

const TONES = ["blue", "sun", "navy"] as const;

/** Teachers: round portraits on coloured discs, name, subject chip and a short bio. */
export default function T10Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || (enabled ? "" : "Meet our teachers");
  const subtitle = section.subtitle || "";
  const source = enabled ? section.members : section.members?.filter((m) => m.name?.trim());
  const members = (source?.length ? source : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "",
    role: m.role || "",
    bio: m.bio || "",
  }));

  return (
    <section className="t10-section t10-teachers-section">
      <div className="t10-container">
        <header className="t10-head t10-head-center t10-reveal">
          <span className="t10-kicker">Teachers</span>
          <EditableText as="h2" className="t10-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t10-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <div className="t10-teachers" data-count={members.length}>
          {members.map((m, idx) => (
            <article key={idx} className="t10-teacher t10-reveal" data-tone={TONES[idx % TONES.length]}>
              <div className="t10-teacher-photo">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name || "Teacher"} loading="lazy" />
                ) : (
                  <span className="t10-teacher-initials" aria-hidden="true">
                    {initials(m.name.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, ""))}
                  </span>
                )}
              </div>
              <EditableText
                as="h3"
                className="t10-teacher-name"
                value={m.name}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              {m.role || enabled ? (
                <EditableText
                  as="p"
                  className="t10-teacher-role"
                  value={m.role}
                  placeholder="Subject / role"
                  onCommit={(next) => setItem("members", members, idx, { role: next })}
                />
              ) : null}
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  className="t10-teacher-bio"
                  value={m.bio}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                <a className="t10-textlink t10-teacher-link" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                  Profile <IconArrowUpRight size={14} />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
