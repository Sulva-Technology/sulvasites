"use client";

import { useId, useState } from "react";

import { SITE_IMAGE_TYPES } from "@/lib/assets";
import { extractLogoColors } from "@/lib/logoColors";
import { choiceFromLogo, type ColorChoice } from "@/lib/ai/setupPalette";
import { MAX_SETUP_FILE_BYTES, type SiteSetup } from "@/lib/ai/setupPhotos";

import { StepCard, primaryBtn, secondaryBtn, type StepProps } from "./stepUi";

export function checkImageFile(file: File): string | null {
  if (!SITE_IMAGE_TYPES.includes(file.type)) return `"${file.name}" is not a PNG, JPG, WebP, GIF, SVG or AVIF image.`;
  if (file.size > MAX_SETUP_FILE_BYTES) return `"${file.name}" is larger than 10 MB.`;
  return null;
}

export function LogoStep(p: StepProps<SiteSetup["logo"]> & { onColors: (c: ColorChoice | null) => void }) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);

  async function take(file: File | undefined) {
    if (!file || p.disabled) return;
    const problem = checkImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (p.value) URL.revokeObjectURL(p.value.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    p.onChange({ file, previewUrl });
    setReading(true);
    try {
      const colors = await extractLogoColors(previewUrl);
      p.onColors(choiceFromLogo(colors.palette));
    } catch {
      p.onColors(null); // e.g. some SVGs cannot be rasterised; colours can still be picked by hand
    } finally {
      setReading(false);
    }
  }

  function remove() {
    if (p.value) URL.revokeObjectURL(p.value.previewUrl);
    p.onChange(null);
    p.onColors(null);
  }

  return (
    <StepCard
      step={1}
      label="Logo step"
      title="Add your logo"
      hint="It goes in the site header, and I will suggest colours from it."
      footer={
        <>
          <button type="button" className={primaryBtn} disabled={p.disabled || !p.value || reading} onClick={p.onDone}>
            {reading ? "Reading colours…" : "Use this logo"}
          </button>
          <button type="button" className={secondaryBtn} disabled={p.disabled} onClick={p.onSkip}>
            I don&apos;t have one
          </button>
        </>
      }
    >
      {p.value ? (
        <div className="flex items-center gap-4 rounded-2xl bg-koi-paper p-3">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-koi-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.value.previewUrl} alt="Your logo" className="max-h-full max-w-full object-contain" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-koi-ink">{p.value.file.name}</p>
            <div className="mt-2 flex gap-2">
              <label htmlFor={inputId} className="cursor-pointer text-koi-ink/75 underline underline-offset-2">
                Replace
              </label>
              <button type="button" onClick={remove} disabled={p.disabled} className="text-koi-ink/75 underline underline-offset-2">
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void take(e.dataTransfer.files[0]);
          }}
          className={
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm transition " +
            (over ? "border-koi-sea bg-koi-paper" : "border-koi-ink/15 hover:border-koi-sea/50")
          }
        >
          <span className="font-medium text-koi-ink">Drop your logo here or click to choose</span>
          <span className="mt-1 text-xs text-koi-ink/55">PNG, JPG, WebP, SVG, GIF or AVIF, up to 10 MB</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept={SITE_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={p.disabled}
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </StepCard>
  );
}
