import type { ReactNode } from "react";

import { WaterBackdrop } from "./WaterBackdrop";

/** Full-screen koi water with a centred glass card (login, change password, no access). */
export function AuthCard({
  title,
  accent,
  subtitle,
  children,
}: {
  title: string;
  accent?: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="koi-app relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      <WaterBackdrop koi />
      <div className="koi-glass relative w-full max-w-sm rounded-[2rem] p-6 text-white shadow-[0_30px_80px_-30px_rgba(10,15,31,.6)] sm:p-8">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white">
            <span className="h-2.5 w-2.5 rounded-full bg-koi-orange" />
          </span>
          Sulva Sites
        </div>
        <h1 className="font-sans text-3xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-4xl">
          <span className="block">{title}</span>
          {accent ? <span className="block font-serif font-normal italic tracking-[-0.01em]">{accent}</span> : null}
        </h1>
        {subtitle ? <p className="mt-3 text-sm text-white/90">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export default AuthCard;
