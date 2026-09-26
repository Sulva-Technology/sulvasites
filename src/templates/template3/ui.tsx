import { pad2 } from "./edit";

/** Section index label, e.g. "(02) — Services". */
export function T3Index({ n, label }: { n?: number; label: string }) {
  return (
    <span className="t3-index">
      {n ? <b>({pad2(n)})</b> : null}
      {n ? " — " : null}
      {label}
    </span>
  );
}

export function T3ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 12L12 4M12 4H5.5M12 4V10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
