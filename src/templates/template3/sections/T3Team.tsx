"use client";

import EditableText from "@/components/inline-editor/EditableText";
import type { TeamSection } from "@/lib/pageSchema";
import { initials, useSectionEditor } from "../edit";
import { T3ArrowIcon, T3Index } from "../ui";

type Member = TeamSection["members"][number];

const FALLBACK: Member[] = [
  { name: "Team member", role: "Role", bio: "A short line about their focus and experience." },
];

/** Portrait grid; photos are greyscale until hovered. */
export default function T3Team({
  section,
  sectionIndex,
  n,
}: {
  section: TeamSection;
  sectionIndex?: number;
  n?: number;
}) {
  const { enabled, set, setItem } = useSectionEditor(section, sectionIndex);
  const title = section.title || "The people";
  const subtitle = section.subtitle || "";
  const members = (section.members?.length ? section.members : FALLBACK).map((m) => ({
    ...m,
    name: m.name || "Team member",
    role: m.role || "Role",
    bio: m.bio || "",
  }));

  return (
    <section className="t3-section">
      <div className="t3-container">
        <div className="t3-section-head t3-reveal">
          <T3Index n={n} label="Team" />
          <div>
            <EditableText
              as="h2"
              className="t3-title"
              value={title}
              placeholder="Team title"
              onCommit={(next) => set({ title: next })}
            />
            {subtitle || enabled ? (
              <EditableText
                as="p"
                className="t3-lead"
                value={subtitle}
                placeholder="Subtitle (optional)"
                multiline
                style={{ marginTop: 20 }}
                onCommit={(next) => set({ subtitle: next })}
              />
            ) : null}
          </div>
        </div>

        <div className="t3-team">
          {members.map((m, idx) => (
            <article key={idx} className="t3-member t3-reveal">
              <div className="t3-portrait">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt={m.name} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{initials(m.name)}</span>
                )}
              </div>
              <EditableText
                as="h3"
                value={m.name}
                placeholder="Name"
                onCommit={(next) => setItem("members", members, idx, { name: next })}
              />
              <EditableText
                as="span"
                className="t3-index"
                value={m.role}
                placeholder="Role"
                onCommit={(next) => setItem("members", members, idx, { role: next })}
              />
              {m.bio || enabled ? (
                <EditableText
                  as="p"
                  value={m.bio}
                  placeholder="Short bio"
                  multiline
                  onCommit={(next) => setItem("members", members, idx, { bio: next })}
                />
              ) : null}
              {m.linkedinUrl ? (
                <a className="t3-link" href={m.linkedinUrl} target="_blank" rel="noreferrer" style={{ marginTop: 12 }}>
                  LinkedIn
                  <span className="t3-arrow">
                    <T3ArrowIcon size={14} />
                  </span>
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
