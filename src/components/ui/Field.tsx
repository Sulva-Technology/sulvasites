import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "block w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink placeholder:text-koi-ink/35 outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15 disabled:bg-koi-paper disabled:text-koi-ink/50";

function Shell({
  id,
  label,
  hint,
  error,
  onDark = false,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  onDark?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`block text-xs font-medium ${onDark ? "text-white/90" : "text-koi-ink/70"}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={onDark ? "rounded-xl bg-white px-2 py-1 text-xs text-red-700" : "text-xs text-red-600"}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={`text-xs ${onDark ? "text-white/85" : "text-koi-ink/50"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  onDark,
  id,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string; onDark?: boolean }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} onDark={onDark}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={`${inputClass} ${error ? "border-red-400" : ""} ${className}`}
        {...input}
      />
    </Shell>
  );
}

export function SelectField({
  label,
  hint,
  id,
  className = "",
  children,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint}>
      <select id={fid} aria-describedby={hint ? `${fid}-hint` : undefined} className={`${inputClass} ${className}`} {...select}>
        {children}
      </select>
    </Shell>
  );
}

export function TextArea({
  label,
  hint,
  id,
  className = "",
  ...area
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint}>
      <textarea id={fid} aria-describedby={hint ? `${fid}-hint` : undefined} className={`${inputClass} ${className}`} {...area} />
    </Shell>
  );
}
