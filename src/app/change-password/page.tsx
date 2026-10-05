"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { resolvePostLoginRoute } from "@/lib/loginRouting";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setIsChecking(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not change password.");
        return;
      }

      // Refresh so the new JWT no longer carries must_change_password.
      await supabase.auth.refreshSession();
      router.replace(await resolvePostLoginRoute(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-gray-600">
          You&apos;re signed in with a temporary password. Choose your own to continue.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              At least {MIN_PASSWORD_LENGTH} characters, with a letter and a number.
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-800">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
          </label>

          {error ? (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "Saving..." : "Save password"}
          </button>
        </form>
      </div>
    </main>
  );
}
