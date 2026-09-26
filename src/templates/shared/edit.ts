"use client";

import { useInlineEditor } from "@/components/inline-editor/InlineEditorContext";
import type { Section } from "@/lib/pageSchema";

/** Inline-editing helpers for a single section (no-ops outside the admin preview). */
export function useSectionEditor<S extends Section>(section: S, sectionIndex?: number) {
  const editor = useInlineEditor();
  const enabled = !!editor?.enabled;

  function set(patch: Partial<S>) {
    if (!editor || sectionIndex == null) return;
    editor.updateSection(sectionIndex, { ...section, ...patch } as Section);
  }

  function setItem<T extends object>(key: keyof S, list: T[], idx: number, patch: Partial<T>) {
    const next = list.map((x) => ({ ...x }));
    next[idx] = { ...next[idx], ...patch };
    set({ [key]: next } as unknown as Partial<S>);
  }

  return { editor, enabled, set, setItem };
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toRoman(n: number) {
  const map: Array<[number, string]> = [
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  let rest = n;
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "•";
}
