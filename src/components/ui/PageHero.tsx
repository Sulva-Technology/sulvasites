import type { ReactNode } from "react";

/** Two-line koi headline for the water band: grotesk title + italic serif accent. */
export function PageHero({
  status,
  title,
  accent,
  subtitle,
  actions,
}: {
  status?: ReactNode;
  title: string;
  accent?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="max-w-3xl text-white">
      {status ? <div className="mb-4">{status}</div> : null}
      <h1 className="font-sans text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.03em] text-white break-words sm:text-6xl">
        <span className="block">{title}</span>
        {accent ? <span className="block font-serif font-normal italic tracking-[-0.01em]">{accent}</span> : null}
      </h1>
      {subtitle ? <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">{subtitle}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default PageHero;
