"use client";

import EditableText from "@/components/inline-editor/EditableText";
import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import { licenceOf, useT12 } from "../ctx";
import { IconShield } from "../icons";

/**
 * The business's own trust chip (e.g. "Licensed & insured"), saved to `socials.licence`.
 * It is never assumed: visitors only see it when the business has filled it in.
 */
export default function T12Licence({ className }: { className?: string }) {
  const { profile } = useT12();
  const editor = useInlineEditor();
  const socials = (profile.socials || {}) as Record<string, unknown>;
  const value = licenceOf(profile);
  if (!editor?.enabled && !value) return null;

  return (
    <span className={`t12-licence ${className ?? ""}`}>
      <IconShield size={16} />
      <EditableText
        as="span"
        value={value}
        placeholder="Licensed & insured (optional)"
        onCommit={(next) => editor?.updateProfileField?.("socials", { ...socials, licence: next })}
      />
    </span>
  );
}
