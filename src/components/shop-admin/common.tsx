"use client";

import { useState, type ReactNode } from "react";

import { toKobo } from "@/lib/shop/money";
import type { ShopRole } from "@/lib/shop/orderStatus";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

export type ShopAdminProps = { siteId: string; basePath: string; role: ShopRole };

export const inputCls =
  "mt-1 w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15 disabled:bg-koi-paper";
export const btnCls =
  "rounded-full bg-koi-ink px-4 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-50";
export const btnGhostCls =
  "rounded-full bg-white px-4 py-2 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-50";
export const btnDangerCls =
  "rounded-full bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-50";
export const cardCls = "rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5";

export function errMsg(e: unknown): string {
  return formatSupabaseError(e) ?? "Something went wrong.";
}

/** Fetch an admin API route with the current user's session token. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, data: body as T & { error?: string } };
}

export function Notice({ kind, children }: { kind: "error" | "ok" | "warn" | "info"; children: ReactNode }) {
  const cls =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : kind === "ok"
        ? "border-green-200 bg-green-50 text-green-800"
        : kind === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-koi-ink/10 bg-koi-paper text-koi-ink/75";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "gray" | "green" | "amber" | "red" | "blue"; children: ReactNode }) {
  const cls = {
    gray: "bg-koi-ink/5 text-koi-ink/70",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
    blue: "bg-koi-sea/10 text-koi-deep",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function NoAccess() {
  return <Notice kind="warn">Your role does not have access to this section.</Notice>;
}

function parseNaira(text: string): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return undefined;
  const k = toKobo(Number(t));
  return Number.isSafeInteger(k) ? k : undefined;
}

/** Naira text input that reports integer kobo (null when empty). Invalid text is not reported. */
export function NairaInput({
  valueKobo,
  onChange,
  placeholder,
  id,
  disabled,
  "aria-label": ariaLabel,
}: {
  valueKobo: number | null;
  onChange: (kobo: number | null) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const fmt = (k: number | null) => (k === null ? "" : String(k / 100));
  const [text, setText] = useState(fmt(valueKobo));
  const [prev, setPrev] = useState(valueKobo);
  if (prev !== valueKobo) {
    setPrev(valueKobo);
    if (parseNaira(text) !== valueKobo) setText(fmt(valueKobo));
  }
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      inputMode="decimal"
      className={inputCls}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        const p = parseNaira(e.target.value);
        if (p !== undefined) {
          setPrev(p);
          onChange(p);
        }
      }}
    />
  );
}
