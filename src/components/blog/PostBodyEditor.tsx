"use client";

import { useEffect, useRef, useState } from "react";

import { SITE_IMAGE_TYPES, uploadSiteImage } from "@/lib/assets";

/**
 * A small word-processor for post bodies: headings, bold/italic, lists, quotes, links and images.
 * Emits HTML; the public site sanitises it again before showing it.
 */

type Cmd = { label: string; title: string; run: () => void; active?: () => boolean };

function exec(command: string, value?: string) {
  // execCommand is deprecated but remains the only cross-browser way to edit rich text without a library.
  document.execCommand(command, false, value);
}

/** Toolbar state; false during server rendering. */
function stateOf(command: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function blockIs(tag: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    return String(document.queryCommandValue("formatBlock")).toLowerCase() === tag;
  } catch {
    return false;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function PostBodyEditor({
  siteId,
  value,
  onChange,
  resetKey,
}: {
  siteId: string;
  value: string;
  onChange: (html: string) => void;
  /** Changes when a different post loads, so the editor swaps its content. */
  resetKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load content only when the post changes; typing must not re-render the DOM under the caret.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "<p><br></p>";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const onSel = () => force((n) => n + 1);
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? "");
  const run = (fn: () => void) => () => {
    ref.current?.focus();
    try {
      exec("defaultParagraphSeparator", "p");
    } catch {
      /* not supported: browsers fall back to <div>, which the sanitiser turns into <p> */
    }
    fn();
    emit();
  };

  const toggleBlock = (tag: string) => run(() => exec("formatBlock", blockIs(tag) ? "<p>" : `<${tag}>`));

  const cmds: Cmd[] = [
    { label: "H2", title: "Heading", run: toggleBlock("h2"), active: () => blockIs("h2") },
    { label: "H3", title: "Subheading", run: toggleBlock("h3"), active: () => blockIs("h3") },
    { label: "B", title: "Bold (Ctrl+B)", run: run(() => exec("bold")), active: () => stateOf("bold") },
    { label: "I", title: "Italic (Ctrl+I)", run: run(() => exec("italic")), active: () => stateOf("italic") },
    { label: "• List", title: "Bulleted list", run: run(() => exec("insertUnorderedList")), active: () => stateOf("insertUnorderedList") },
    { label: "1. List", title: "Numbered list", run: run(() => exec("insertOrderedList")), active: () => stateOf("insertOrderedList") },
    { label: "“ Quote", title: "Quote", run: toggleBlock("blockquote"), active: () => blockIs("blockquote") },
    {
      label: "Link",
      title: "Add a link to the selected text",
      run: run(() => {
        const url = window.prompt("Link address (https://… or /page)");
        if (!url) return;
        exec("createLink", url.trim());
      }),
    },
    { label: "Unlink", title: "Remove link", run: run(() => exec("unlink")) },
    { label: "— Line", title: "Divider", run: run(() => exec("insertHorizontalRule")) },
    { label: "Clear", title: "Clear formatting", run: run(() => { exec("removeFormat"); exec("formatBlock", "<p>"); }) },
  ];

  async function onImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadSiteImage(siteId, file);
      ref.current?.focus();
      exec("insertHTML", `<figure><img src="${escapeHtml(url)}" alt=""></figure><p><br></p>`);
      emit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const btn = "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-koi-ink/75 hover:bg-koi-ink/5 aria-pressed:bg-koi-ink aria-pressed:text-white";

  return (
    <div className="overflow-hidden rounded-2xl border border-koi-ink/10 bg-white focus-within:border-koi-sea focus-within:ring-4 focus-within:ring-koi-sea/15">
      <div role="toolbar" aria-label="Formatting" className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-koi-ink/10 bg-koi-paper/80 p-1.5 backdrop-blur">
        {cmds.map((c) => (
          <button
            key={c.label}
            type="button"
            title={c.title}
            aria-label={c.title}
            aria-pressed={c.active ? !!c.active() : undefined}
            className={btn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={c.run}
          >
            {c.label}
          </button>
        ))}
        <button type="button" className={btn} title="Insert a photo" disabled={busy} onMouseDown={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={SITE_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => void onImage(e.target.files?.[0])}
        />
      </div>
      <div
        ref={ref}
        className="post-body-editor min-h-[320px] px-5 py-4 text-[15px] leading-7 text-koi-ink outline-none"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Post text"
        spellCheck
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          // Paste as plain paragraphs so formatting from Word / web pages doesn't come along.
          const text = e.clipboardData.getData("text/plain");
          if (!text) return;
          e.preventDefault();
          const html = text
            .replace(/\r\n?/g, "\n")
            .split(/\n{2,}/)
            .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
            .filter((p) => p !== "<p></p>")
            .join("");
          exec("insertHTML", html || escapeHtml(text));
          emit();
        }}
      />
      {error ? <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
