import type { ReactNode } from "react";

export type StatusTone = "live" | "draft" | "warn" | "neutral";

const dot: Record<StatusTone, string> = {
  live: "bg-[#3ee08f]",
  draft: "bg-amber-400",
  warn: "bg-koi-orange",
  neutral: "bg-current opacity-50",
};

export function StatusPill({
  tone = "neutral",
  onDark = false,
  children,
}: {
  tone?: StatusTone;
  onDark?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider ${
        onDark ? "koi-glass text-white" : "bg-koi-ink/5 text-koi-ink/80"
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[tone]}`} />
      {children}
    </span>
  );
}

export default StatusPill;
