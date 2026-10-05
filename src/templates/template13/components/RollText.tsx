import type { CSSProperties } from "react";
import { splitChars } from "../lib";

/** Offloop-style rolling label: two stacked copies; letters slide up one by one on hover/focus of the parent link. */
export default function RollText({ text }: { text: string }) {
  const chars = splitChars(text);
  return (
    <span className="t13-roll" aria-label={text}>
      <span className="t13-roll-row" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties}>{c === " " ? " " : c}</span>
        ))}
      </span>
      <span className="t13-roll-row t13-roll-next" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties}>{c === " " ? " " : c}</span>
        ))}
      </span>
    </span>
  );
}
