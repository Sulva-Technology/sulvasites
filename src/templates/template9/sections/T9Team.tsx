"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, pad2, useSectionEditor } from "@/templates/shared/edit";
import { IconArrowUpRight } from "../icons";

/**
 * Coaches grid: tall portraits with name and role over the photo; the bio slides up on hover
 * or keyboard focus, and sits below the photo on touch screens and while editing.
 */
export default function T9Team({ section, sectionIndex }: { section: TeamSection; sectionIndex?: number }) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  if (!enabled && !section.members?.some((m) => m.name?.trim())) return null;
  const title = section.title || "Meet the coaches";
  const subtitle = section.subtitle || "";
  const source = enabled ? section.members : section.members?.filter((m) => m.name?.trim());
  const members = (source?.length ? source : [{ name: "", role: "", bio: "" }]).map((m) => ({
    ...m,
    name: m.name || "",
    role: m.role || "",
    bio: m.bio || "",
  }));

  return (
    <section className="t9-section t9-coaches-section">
      <div className="t9-container">
        <header className="t9-head t9-head-split t9-reveal">
          <div>
            <span className="t9-kicker t9-kicker-dark">Coaches</span>
            <EditableText as="h2" className="t9-h2" value={title} placeholder="Team title" onCommit={(next) => set({ title: next })} />
          </div>
          {subtitle || enabled ? (
            <EditableText
              as="p"
              className="t9-head-note"
              value={subtitle}
              placeholder="Subtitle (optional)"
              multiline
              onCommit={(next) => set({ subtitle: next })}
            />
          ) : null}
        </header>

        <div className="t9-coaches" data-count={Math.min(members.length, 4)} data-edit={enabled}>
          {members.map((m, idx) => {
            const hasBio = !!m.bio || !!(m.linkedinUrl && m.linkedinUrl !== "#");
            return (
              <article
                key={idx}
                className="t9-coach t9-reveal"
                data-bio={hasBio}
                tabIndex={!enabled && hasBio ? 0 : undefined}
                aria-label={!enabled && hasBio ? [m.name, m.role].filter(Boolean).join(", ") : undefined}
              >
                <div className="t9-coach-photo">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt={m.name || "Coach"} loading="lazy" />
                  ) : (
                    <span className="t9-coach-initials" aria-hidden="true">
                      {initials(m.name)}
                    </span>
                  )}
                  <span className="t9-coach-no" aria-hidden="true">
                    {pad2(idx + 1)}
                  </span>
                </div>
                <div className="t9-coach-body">
                  <EditableText
                    as="h3"
                    className="t9-coach-name"
                    value={m.name}
                    placeholder="Name"
                    onCommit={(next) => setItem("members", members, idx, { name: next })}
                  />
                  {m.role || enabled ? (
                    <EditableText
                      as="p"
                      className="t9-coach-role"
                      value={m.role}
                      placeholder="Role / speciality"
                      onCommit={(next) => setItem("members", members, idx, { role: next })}
                    />
                  ) : null}
                  {hasBio || enabled ? (
                    <div className="t9-coach-more">
                      <div>
                        {m.bio || enabled ? (
                          <EditableText
                            as="p"
                            className="t9-coach-bio"
                            value={m.bio}
                            placeholder="Short bio"
                            multiline
                            onCommit={(next) => setItem("members", members, idx, { bio: next })}
                          />
                        ) : null}
                        {m.linkedinUrl && m.linkedinUrl !== "#" ? (
                          <a className="t9-coach-link" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                            Profile <IconArrowUpRight size={14} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
