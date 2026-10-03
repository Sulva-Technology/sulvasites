"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { useInlineEditor } from "./InlineEditorContext";

type EditableTag =
  | "span"
  | "p"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "blockquote";

type EditableTextProps = {
  as?: EditableTag;
  value: string;
  placeholder?: string;
  sectionIndex?: number;
  field?: string;
  onCommit?: (next: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
};

function cleanText(input: string, multiline: boolean) {
  // contentEditable produces weird whitespace/newlines. Keep it predictable.
  let t = input.replace(/\u00A0/g, " "); // nbsp
  if (!multiline) t = t.replace(/\r?\n/g, " ");
  return t.trim();
}

export default function EditableText({
  as,
  value,
  placeholder,
  sectionIndex,
  field,
  onCommit,
  className,
  style,
  multiline = false,
}: EditableTextProps) {
  const editor = useInlineEditor();
  const enabled = !!editor?.enabled;
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const display = useMemo(() => value || "", [value]);

  const Tag: EditableTag = as ?? "span";

  if (!enabled) {
    return (
      <Tag className={className} style={style}>
        {display}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-inline-edit="true"
      onFocus={() => {
        setIsFocused(true);
        setDraft(display || "");
      }}
      onBlur={(e) => {
        setIsFocused(false);
        const raw = cleanText((e.currentTarget as HTMLElement).innerText, multiline);
        // Defensive: a hint that somehow ended up as text is never saved as content.
        const next = placeholder && raw === placeholder.trim() ? "" : raw;
        setDraft("");
        if (onCommit) {
          onCommit(next);
          return;
        }
        if (sectionIndex == null || !field) return;
        editor?.updateSectionField(sectionIndex, field, next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onInput={(e) => {
        setDraft(cleanText((e.currentTarget as HTMLElement).innerText, multiline));
      }}
      style={{
        ...(style ?? {}),
        outline: "none",
        cursor: "text",
        borderRadius: 6,
        boxShadow: isFocused ? "0 0 0 3px rgba(17, 24, 39, 0.12)" : undefined,
        background: isFocused ? "rgba(255,255,255,0.6)" : undefined,
        padding: isFocused ? "2px 4px" : undefined,
      }}
      aria-label="Editable text"
      // The hint is shown via CSS (globals.css) — never as text content, so it can't be saved.
      data-placeholder={!(isFocused ? draft : display) && placeholder ? placeholder : undefined}
    >
      {(isFocused ? draft : display) || ""}
    </Tag>
  );
}

