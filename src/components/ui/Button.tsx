import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type PillVariant = "primary" | "glass" | "white" | "quiet";

type CommonProps = {
  variant?: PillVariant;
  /** White disc with an arrow on the right. Default: true for primary. */
  arrow?: boolean;
  /** Disables the button and shows a spinner (blocks double submit). */
  loading?: boolean;
  size?: "sm" | "md";
  className?: string;
  children?: ReactNode;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href"> & { href: string };

export type PillButtonProps = ButtonProps | LinkProps;

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange";

function variantClass(variant: PillVariant, size: "sm" | "md", withArrow: boolean): string {
  const sm = size === "sm";
  switch (variant) {
    case "primary":
      return [
        "bg-koi-ink text-white hover:bg-black font-medium",
        withArrow ? (sm ? "pl-4 pr-1 py-1" : "pl-5 pr-1.5 py-1.5") : sm ? "px-4 py-1.5" : "px-5 py-2",
      ].join(" ");
    case "glass":
      return `koi-glass text-white hover:bg-white/25 ${sm ? "px-4 py-1.5" : "px-5 py-2"}`;
    case "white":
      return `bg-white font-semibold text-koi-ink shadow-sm hover:bg-white/90 ${sm ? "px-3.5 py-1" : "px-4 py-1.5"}`;
    case "quiet":
      return `text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 ${sm ? "px-3.5 py-1.5" : "px-4 py-2"}`;
  }
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowDisc({ size }: { size: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center rounded-full bg-white text-koi-ink transition-transform group-hover:translate-x-0.5 ${
        size === "sm" ? "h-6 w-6" : "h-7 w-7"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </span>
  );
}

/** Koi pill button. Renders a next/link when `href` is given. */
export function PillButton(props: PillButtonProps) {
  const { variant = "primary", arrow, loading = false, size = "md", className = "", children, ...rest } = props;
  const withArrow = arrow ?? variant === "primary";
  const cls = [
    "group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full transition-colors",
    size === "sm" ? "text-xs" : "text-sm",
    focus,
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:opacity-60",
    variantClass(variant, size, withArrow),
    className,
  ].join(" ");

  const inner = (
    <>
      {loading ? <Spinner /> : null}
      <span>{children}</span>
      {withArrow ? <ArrowDisc size={size} /> : null}
    </>
  );

  if (typeof rest.href === "string") {
    const { href, ...anchor } = rest as Omit<LinkProps, keyof CommonProps>;
    return (
      <Link href={href} className={cls} aria-disabled={loading || undefined} {...anchor}>
        {inner}
      </Link>
    );
  }

  const { disabled, type, ...button } = rest as Omit<ButtonProps, keyof CommonProps>;
  return (
    <button
      type={type ?? "button"}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...button}
    >
      {inner}
    </button>
  );
}

export default PillButton;
