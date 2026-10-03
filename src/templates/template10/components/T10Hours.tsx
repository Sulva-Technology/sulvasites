"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { splitHoursLine, useT10 } from "../ctx";

/**
 * Office hours as two-column rows ("Mon–Fri    07:30–16:00"); "Closed" rows are muted.
 * In the editor it becomes one multi-line field saved to `socials.hours`.
 * Renders nothing for visitors when no hours are known.
 */
export default function T10Hours({ className }: { className?: string }) {
  const { hours, profile } = useT10();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;

  if (editor?.enabled) {
    return (
      <EditableText
        as="p"
        className={`t10-hours-edit ${className ?? ""}`}
        value={hours.join("\n")}
        placeholder={"Office hours, one line per row\nMon–Fri · 07:30–16:00"}
        multiline
        onCommit={(next) => editor.updateProfileField?.("socials", { ...socials, hours: next })}
      />
    );
  }

  if (!hours.length) return null;

  return (
    <ul className={`t10-hours ${className ?? ""}`}>
      {hours.map((line, i) => {
        const parts = splitHoursLine(line);
        const closed = /closed/i.test(line);
        return (
          <li key={`${i}-${line}`} data-closed={closed}>
            {parts ? (
              <>
                <span>{parts[0]}</span>
                <b>{parts[1]}</b>
              </>
            ) : (
              <span>{line}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
