"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { splitHoursLine, useT13 } from "../ctx";

/**
 * Opening hours as two-column rows; "Closed" rows are muted. In the editor it becomes one
 * multi-line field saved to `socials.hours`. Renders nothing for visitors when no hours are known.
 */
export default function T13Hours({ className }: { className?: string }) {
  const { hours, profile } = useT13();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;

  if (editor?.enabled) {
    return (
      <EditableText
        as="p"
        className={`t13-hours-edit ${className ?? ""}`}
        value={hours.join("\n")}
        placeholder={"Opening hours, one line per row\nMon–Sat · 10:00–18:00"}
        multiline
        onCommit={(next) => editor.updateProfileField?.("socials", { ...socials, hours: next })}
      />
    );
  }

  if (!hours.length) return null;

  return (
    <ul className={`t13-hours ${className ?? ""}`}>
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
