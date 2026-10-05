import type { ReactNode } from "react";

export const cardClass =
  "rounded-3xl bg-white shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5";

/** White content card. Pass `className="p-0"` to drop the default padding. */
export function Card({
  className = "",
  children,
  as = "section",
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div";
}) {
  const Tag = as;
  const pad = /(^|\s)p-\S+/.test(className) ? "" : "p-6";
  return <Tag className={`${cardClass} ${pad} ${className}`}>{children}</Tag>;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-koi-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-koi-ink/60">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default Card;
