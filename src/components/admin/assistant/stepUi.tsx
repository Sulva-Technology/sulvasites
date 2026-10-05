"use client";

import type { ReactNode } from "react";

/** Shared props for the assistant setup step cards. */
export type StepProps<T> = {
  value: T;
  onChange: (v: T) => void;
  onDone: () => void;
  onSkip: () => void;
  disabled?: boolean;
};

export const primaryBtn =
  "rounded-full bg-koi-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 transition hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:cursor-not-allowed disabled:opacity-50";

export function StepCard(props: { step: number; title: string; hint: string; children: ReactNode; footer: ReactNode; label: string }) {
  return (
    <section aria-label={props.label} className="rounded-3xl bg-white p-4 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-koi-orange">Step {props.step} of 3</p>
      <h3 className="mt-1 text-base font-semibold tracking-tight text-koi-ink">{props.title}</h3>
      <p className="mt-1 text-sm text-koi-ink/60">{props.hint}</p>
      <div className="mt-4">{props.children}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">{props.footer}</div>
    </section>
  );
}

export function Swatches({ colors, size = "h-5 w-5" }: { colors: string[]; size?: string }) {
  return (
    <span className="inline-flex -space-x-1.5" aria-hidden>
      {colors.map((c, i) => (
        <span key={`${c}-${i}`} className={`${size} rounded-full ring-2 ring-white`} style={{ background: c }} />
      ))}
    </span>
  );
}
