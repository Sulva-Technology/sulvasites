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
  "rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export function StepCard(props: { step: number; title: string; hint: string; children: ReactNode; footer: ReactNode; label: string }) {
  return (
    <section aria-label={props.label} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Step {props.step} of 3</p>
      <h3 className="mt-1 text-base font-semibold text-gray-900">{props.title}</h3>
      <p className="mt-1 text-sm text-gray-600">{props.hint}</p>
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
