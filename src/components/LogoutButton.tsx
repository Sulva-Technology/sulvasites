"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LogoutButton({ variant = "quiet" }: { variant?: "quiet" | "glass" } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    setIsLoading(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error: signOutError } = await supabase.auth.signOut();

    setIsLoading(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.replace("/login");
  }

  if (variant === "glass") {
    return (
      <div className="flex items-center gap-2">
        {error ? (
          <span role="alert" className="max-w-[10rem] truncate rounded-full bg-white px-2 py-0.5 text-xs text-red-700">
            {error}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoading}
          aria-label={isLoading ? "Signing out" : "Log out"}
          title="Log out"
          className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M13 14l4-4-4-4M17 10H8" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoading}
        className="rounded-full px-4 py-2 text-sm text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
      >
        {isLoading ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}

