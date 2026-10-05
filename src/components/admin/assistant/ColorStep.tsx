"use client";

import { useMemo, useState } from "react";

import { expandPalette, presetsFor, type ColorChoice } from "@/lib/ai/setupPalette";
import { TEMPLATE_THEME_CONFIGS } from "@/lib/templateTheme";

import { StepCard, Swatches, primaryBtn, secondaryBtn, type StepProps } from "./stepUi";

type Option = { key: string; name: string; choice: ColorChoice };

const sameChoice = (a: ColorChoice | null, b: ColorChoice) =>
  !!a && a.source === b.source && a.accent.toLowerCase() === b.accent.toLowerCase() && a.accent2.toLowerCase() === b.accent2.toLowerCase();

function OptionPill({ option, checked, onSelect, disabled }: { option: Option; checked: boolean; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition disabled:opacity-50 " +
        (checked ? "bg-black text-white ring-2 ring-black" : "bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50")
      }
    >
      <Swatches colors={[option.choice.accent, option.choice.accent2]} size="h-4 w-4" />
      {option.name}
    </button>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <div role="radiogroup" aria-label={title} className="mt-1.5 flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

export function ColorStep(
  p: StepProps<ColorChoice | null> & {
    category: string;
    templateKey: string;
    fromLogo: ColorChoice | null;
    fromWords: ColorChoice | null;
  },
) {
  const defaults = TEMPLATE_THEME_CONFIGS[p.templateKey]?.defaults ?? TEMPLATE_THEME_CONFIGS.t1!.defaults;
  const [custom, setCustom] = useState({
    accent: p.value?.source === "custom" ? p.value.accent : defaults.accent!,
    accent2: p.value?.source === "custom" ? p.value.accent2 : defaults.accent2!,
  });

  const presets: Option[] = useMemo(
    () => presetsFor(p.category).map((x) => ({ key: x.id, name: x.name, choice: { accent: x.accent, accent2: x.accent2, source: "preset" as const } })),
    [p.category],
  );
  const logo: Option | null = p.fromLogo ? { key: "logo", name: "Logo colours", choice: p.fromLogo } : null;
  const words: Option | null = p.fromWords ? { key: "words", name: "Your colours", choice: p.fromWords } : null;

  const preview = expandPalette(p.templateKey, p.value ?? { accent: defaults.accent!, accent2: defaults.accent2!, source: "preset" });
  const pick = (o: Option) => p.onChange(o.choice);
  const setCustomColor = (k: "accent" | "accent2", v: string) => {
    const next = { ...custom, [k]: v };
    setCustom(next);
    p.onChange({ ...next, source: "custom" });
  };
  const categoryName = p.category.replace(/_/g, " ");

  return (
    <StepCard
      step={2}
      label="Colours step"
      title="Pick your colours"
      hint="The main colour is used for buttons and links, the dark colour for bands and the footer."
      footer={
        <>
          <button type="button" className={primaryBtn} disabled={p.disabled || !p.value} onClick={p.onDone}>
            Use these colours
          </button>
          <button type="button" className={secondaryBtn} disabled={p.disabled} onClick={p.onSkip}>
            Choose for me
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
        <div className="space-y-3">
          {logo ? (
            <Row title="From your logo">
              <OptionPill option={logo} checked={sameChoice(p.value, logo.choice)} onSelect={() => pick(logo)} disabled={p.disabled} />
            </Row>
          ) : null}
          {words ? (
            <Row title="From what you told me">
              <OptionPill option={words} checked={sameChoice(p.value, words.choice)} onSelect={() => pick(words)} disabled={p.disabled} />
            </Row>
          ) : null}
          <Row title={`Suggested for ${categoryName}`}>
            {presets.map((o) => (
              <OptionPill key={o.key} option={o} checked={sameChoice(p.value, o.choice)} onSelect={() => pick(o)} disabled={p.disabled} />
            ))}
          </Row>
          <div>
            <p className="text-xs font-medium text-gray-500">Custom</p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {([
                ["accent", "Main colour"],
                ["accent2", "Dark colour"],
              ] as const).map(([k, label]) => (
                <label
                  key={k}
                  className={
                    "inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm ring-1 " +
                    (p.value?.source === "custom" ? "ring-black" : "ring-gray-300")
                  }
                >
                  <input
                    type="color"
                    value={custom[k]}
                    disabled={p.disabled}
                    onChange={(e) => setCustomColor(k, e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div aria-label="Colour preview" className="overflow-hidden rounded-2xl ring-1 ring-gray-200" style={{ background: preview.bg }}>
          <div className="p-4">
            <p className="text-xs" style={{ color: preview.muted }}>
              Preview
            </p>
            <p className="mt-1 text-base font-semibold" style={{ color: preview.ink }}>
              Your headline here
            </p>
            <p className="mt-1 text-xs" style={{ color: preview.muted }}>
              A short line about the business.
            </p>
            <span className="mt-3 inline-block rounded-full px-3 py-1.5 text-xs font-medium text-white" style={{ background: preview.accent }}>
              Get in touch
            </span>
            <span className="ml-2 text-xs font-medium underline" style={{ color: preview.accent }}>
              Learn more
            </span>
          </div>
          <div className="px-4 py-3 text-xs text-white/90" style={{ background: preview.accent2 }}>
            Footer and dark bands
          </div>
        </div>
      </div>
    </StepCard>
  );
}
