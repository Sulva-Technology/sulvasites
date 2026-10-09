"use client";

import { useId, useMemo, useState } from "react";

import { SITE_IMAGE_TYPES } from "@/lib/assets";
import { choiceFromLogo, type ColorChoice } from "@/lib/ai/setupPalette";
import { MAX_SETUP_FILE_BYTES } from "@/lib/ai/setupPhotos";
import { extractLogoColors } from "@/lib/logoColors";
import type { SignupAnswers } from "@/lib/signup/fallbackSite";
import { MAX_DETAILS_CHARS, buildDetailsPrompt, detailsSummary, parseDetails } from "@/lib/signup/ownerDetails";

export type LogoPick = { file: File; previewUrl: string };

const AI_LINKS = [
  ["ChatGPT", "https://chatgpt.com/"],
  ["Gemini", "https://gemini.google.com/"],
  ["Claude", "https://claude.ai/new"],
] as const;

type Props = {
  answers: SignupAnswers;
  templateKey: string;
  detailsText: string;
  color: ColorChoice | null;
  logo: LogoPick | null;
  onDetails: (text: string) => void;
  onColor: (c: ColorChoice | null) => void;
  onLogo: (l: LogoPick | null) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function ContentStep(p: Props) {
  const prompt = useMemo(
    () => buildDetailsPrompt({ businessName: p.answers.businessName, whatTheyDo: p.answers.whatTheyDo, city: p.answers.city, templateKey: p.templateKey }),
    [p.answers.businessName, p.answers.whatTheyDo, p.answers.city, p.templateKey],
  );
  const parsed = useMemo(() => parseDetails(p.detailsText), [p.detailsText]);
  const hasAnything = !!p.logo || parsed.kind !== "empty";

  return (
    <form onSubmit={(e) => { e.preventDefault(); p.onNext(); }}>
      <h1 className="text-2xl font-semibold">Add your content</h1>
      <p className="mt-1 text-sm text-koi-ink/60">Optional, but it makes the site truly yours. Skip it and we&apos;ll write everything for you.</p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">1. Your logo</h2>
        <p className="text-xs text-koi-ink/60">We&apos;ll pull your brand colours from it automatically.</p>
        <LogoPicker logo={p.logo} color={p.color} onLogo={p.onLogo} onColor={p.onColor} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">2. Let your AI fill in your details</h2>
        <ol className="mt-2 grid gap-1 text-xs text-koi-ink/70">
          <li><span className="font-medium text-koi-deep">a.</span> Copy the prompt below.</li>
          <li>
            <span className="font-medium text-koi-deep">b.</span> Paste it into{" "}
            {AI_LINKS.map(([name, href], i) => (
              <span key={name}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-koi-deep underline underline-offset-2">{name}</a>
                {i < AI_LINKS.length - 2 ? ", " : i === AI_LINKS.length - 2 ? " or " : ""}
              </span>
            ))}{" "}
            and answer its questions.
          </li>
          <li><span className="font-medium text-koi-deep">c.</span> Copy its final answer and paste it in the box below.</li>
        </ol>
        <PromptBox prompt={prompt} />
        <label className="mt-4 block text-xs font-medium text-koi-ink/60" htmlFor="sv-details">Your AI&apos;s answer</label>
        <textarea
          id="sv-details"
          rows={6}
          maxLength={MAX_DETAILS_CHARS}
          value={p.detailsText}
          onChange={(e) => p.onDetails(e.target.value)}
          placeholder="Paste the whole answer here, including the { … } block"
          className="mt-1 w-full rounded-2xl bg-white px-4 py-3 font-mono text-xs ring-1 ring-koi-ink/10 focus:outline-none focus:ring-2 focus:ring-koi-deep"
        />
        <DetailsStatus parsed={parsed} />
      </section>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={p.onBack} className="text-sm text-koi-ink/60">← Back</button>
        <button type="submit" className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white">{hasAnything ? "Next" : "Skip for now"}</button>
      </div>
    </form>
  );
}

function PromptBox({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("ok");
    } catch {
      setCopied("fail"); // e.g. clipboard blocked: the text is selectable below
    }
    setTimeout(() => setCopied("idle"), 2500);
  }
  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-koi-paper ring-1 ring-koi-ink/10">
      <div className="flex items-center justify-between gap-3 border-b border-koi-ink/10 px-4 py-2">
        <span className="text-xs font-medium text-koi-ink/60">Prompt for your AI</span>
        <button type="button" onClick={copy} className="rounded-full bg-koi-ink px-4 py-1.5 text-xs font-medium text-white">
          {copied === "ok" ? "Copied ✓" : copied === "fail" ? "Select and copy below" : "Copy prompt"}
        </button>
      </div>
      <pre className="max-h-44 overflow-auto whitespace-pre-wrap px-4 py-3 text-[11px] leading-relaxed text-koi-ink/75">{prompt}</pre>
    </div>
  );
}

function DetailsStatus({ parsed }: { parsed: ReturnType<typeof parseDetails> }) {
  if (parsed.kind === "empty") return null;
  if (parsed.kind === "text") {
    return (
      <p className="mt-2 rounded-2xl bg-koi-orange/10 px-4 py-2 text-xs text-koi-ink/80">
        We&apos;ll use this as notes. For the best result, paste the block that starts with <code>{"{"}</code> and ends with <code>{"}"}</code>.
      </p>
    );
  }
  const found = detailsSummary(parsed.details);
  return (
    <p className="mt-2 rounded-2xl bg-koi-deep/5 px-4 py-2 text-xs text-koi-ink/80">
      <span className="font-medium text-koi-deep">Got it.</span> {found.length ? `We found ${found.join(", ")}.` : "We'll use what you gave us."}
    </p>
  );
}

function LogoPicker({ logo, color, onLogo, onColor }: Pick<Props, "logo" | "color" | "onLogo" | "onColor">) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);

  async function take(file: File | undefined) {
    if (!file) return;
    if (!SITE_IMAGE_TYPES.includes(file.type)) return setError(`"${file.name}" is not a PNG, JPG, WebP, GIF, SVG or AVIF image.`);
    if (file.size > MAX_SETUP_FILE_BYTES) return setError(`"${file.name}" is larger than 10 MB.`);
    setError(null);
    if (logo) URL.revokeObjectURL(logo.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    onLogo({ file, previewUrl });
    setReading(true);
    try {
      onColor(choiceFromLogo((await extractLogoColors(previewUrl)).palette));
    } catch {
      onColor(null); // some SVGs can't be read; the design's own colours are used
    } finally {
      setReading(false);
    }
  }

  function remove() {
    if (logo) URL.revokeObjectURL(logo.previewUrl);
    onLogo(null);
    onColor(null);
  }

  const setOne = (k: "accent" | "accent2", v: string) => color && onColor({ ...color, [k]: v, source: "custom" });

  return (
    <div className="mt-3">
      {logo ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-koi-paper p-3">
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-koi-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.previewUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{logo.file.name}</p>
            <div className="mt-1 flex gap-3 text-xs">
              <label htmlFor={inputId} className="cursor-pointer text-koi-ink/70 underline underline-offset-2">Replace</label>
              <button type="button" onClick={remove} className="text-koi-ink/70 underline underline-offset-2">Remove</button>
            </div>
          </div>
          <div className="text-xs">
            {reading ? (
              <span className="text-koi-ink/60">Reading colours…</span>
            ) : color ? (
              <div className="flex flex-wrap gap-2">
                {([["accent", "Main"], ["accent2", "Dark"]] as const).map(([k, label]) => (
                  <label key={k} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-koi-ink/10" title="Change colour">
                    <input type="color" value={color[k]} onChange={(e) => setOne(k, e.target.value)} className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                    {label}
                  </label>
                ))}
              </div>
            ) : (
              <span className="text-koi-ink/60">Couldn&apos;t read colours; we&apos;ll use the design&apos;s own.</span>
            )}
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${over ? "border-koi-sea bg-koi-paper" : "border-koi-ink/15 hover:border-koi-sea/50"}`}
        >
          <span className="font-medium">Drop your logo here or click to choose</span>
          <span className="mt-1 text-xs text-koi-ink/55">PNG, JPG, WebP, SVG, GIF or AVIF, up to 10 MB</span>
        </label>
      )}
      <input id={inputId} type="file" accept={SITE_IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      {error ? <p role="alert" className="mt-2 text-sm text-koi-orange">{error}</p> : null}
    </div>
  );
}
