"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { splitHoursLine, useT9 } from "../ctx";

/**
 * Opening hours as two-column rows ("Mon–Fri    06:00–22:00"); "Closed" rows are muted.
 * In the editor it becomes one multi-line field saved to `socials.hours`.
 * Renders nothing for visitors when no hours are known.
 */
export default function T9Hours({ className, limit }: { className?: string; limit?: number }) {
  const { hours, profile } = useT9();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;

  if (editor?.enabled) {
    return (
      <EditableText
        as="p"
        className={`t9-hours-edit ${className ?? ""}`}
        value={hours.join("\n")}
        placeholder={"Opening hours, one line per row\nMon–Fri · 06:00–22:00"}
        multiline
        onCommit={(next) => editor.updateProfileField?.("socials", { ...socials, hours: next })}
      />
    );
  }

  if (!hours.length) return null;

  return (
    <ul className={`t9-hours ${className ?? ""}`}>
      {hours.slice(0, limit ?? hours.length).map((line, i) => {
        const parts = splitHoursLine(line);
        const closed = /closed/i.test(line);
        return parts ? (
          <li key={`${i}-${line}`} data-closed={closed}>
            <span>{parts[0]}</span>
            <b>{parts[1]}</b>
          </li>
        ) : (
          <li key={`${i}-${line}`} data-closed={closed}>
            <span>{line}</span>
          </li>
        );
      })}
    </ul>
  );
}
