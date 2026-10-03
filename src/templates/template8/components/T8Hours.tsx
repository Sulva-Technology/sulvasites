"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { splitHoursLine, useT8 } from "../ctx";

/**
 * Opening hours as two-column rows ("Mon–Fri    08:00–20:00"); "Closed" rows are muted.
 * In the editor it becomes one multi-line field saved to `socials.hours`.
 * Renders nothing for visitors when no hours are known.
 */
export default function T8Hours({ className, limit }: { className?: string; limit?: number }) {
  const { hours, profile } = useT8();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;

  if (editor?.enabled) {
    return (
      <EditableText
        as="p"
        className={`t8-hours-edit ${className ?? ""}`}
        value={hours.join("\n")}
        placeholder={"Opening hours, one line per row\nMon–Fri · 08:00–18:00"}
        multiline
        onCommit={(next) => editor.updateProfileField?.("socials", { ...socials, hours: next })}
      />
    );
  }

  if (!hours.length) return null;

  return (
    <ul className={`t8-hours ${className ?? ""}`}>
      {hours.slice(0, limit ?? hours.length).map((line) => {
        const parts = splitHoursLine(line);
        const closed = /closed/i.test(line);
        return parts ? (
          <li key={line} data-closed={closed}>
            <span>{parts[0]}</span>
            <b>{parts[1]}</b>
          </li>
        ) : (
          <li key={line} data-closed={closed}>
            <span>{line}</span>
          </li>
        );
      })}
    </ul>
  );
}
