/** The Sulvatech "S" (same path as sulvatech.com). Takes the text colour, so it works on paper, ink and water. */
export const SULVA_MARK_PATH =
  "M89 92.5C89 37 126 0 181.5 0S274 37 274 92.5L89 185ZM185 236.5C185 292 148 329 92.5 329S0 292 0 236.5L185 144Z";

export function SulvaMark({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 274 329" fill="currentColor" aria-hidden="true" className={className}>
      <path d={SULVA_MARK_PATH} />
    </svg>
  );
}

/** Mark + "Sulva Sites" wordmark. `accent` colours the serif "Sites" (pass "" to keep the text colour). */
export function Logo({ accent = "text-koi-deep", markClassName = "h-6 w-auto" }: { accent?: string; markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SulvaMark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight">
        Sulva <span className={`font-serif text-xl font-normal italic ${accent}`}>Sites</span>
      </span>
    </span>
  );
}

export default Logo;
