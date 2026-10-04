"use client";

import { useState, type ReactNode } from "react";

import { toKobo } from "@/lib/shop/money";
import type { ShopRole } from "@/lib/shop/orderStatus";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

export type ShopAdminProps = { siteId: string; basePath: string; role: ShopRole };

export const inputCls =
  "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none disabled:bg-gray-100";
export const btnCls =
  "rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50";
export const btnGhostCls =
  "rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50";
export const btnDangerCls =
  "rounded bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50";
export const cardCls = "rounded-lg border border-gray-200 bg-white p-4 shadow-sm";

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
          : "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "gray" | "green" | "amber" | "red" | "blue"; children: ReactNode }) {
  const cls = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
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
