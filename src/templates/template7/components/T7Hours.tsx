"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { splitHoursLine, useT7 } from "../ctx";

/**
 * Opening hours as dotted-leader rows ("Tue–Thu ········ 12:00–22:00").
 * In the editor it becomes one multi-line field saved to `socials.hours`.
 * Renders nothing for visitors when no hours are known.
 */
export default function T7Hours({ className }: { className?: string }) {
  const { hours, profile } = useT7();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;

  if (editor?.enabled) {
    return (
      <EditableText
        as="p"
        className={`t7-hours-edit ${className ?? ""}`}
        value={hours.join("\n")}
        placeholder={"Opening hours, one line per row\nTue–Sun · 12:00–22:00"}
        multiline
        onCommit={(next) => editor.updateProfileField?.("socials", { ...socials, hours: next })}
      />
    );
  }

  if (!hours.length) return null;

  return (
    <ul className={`t7-hours ${className ?? ""}`}>
      {hours.map((line) => {
        const parts = splitHoursLine(line);
        return parts ? (
          <li key={line}>
            <span>{parts[0]}</span>
            <i aria-hidden="true" />
            <b>{parts[1]}</b>
          </li>
        ) : (
          <li key={line}>
            <span>{line}</span>
          </li>
        );
      })}
    </ul>
  );
}
