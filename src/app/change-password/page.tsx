"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { resolvePostLoginRoute } from "@/lib/loginRouting";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { PillButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

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
    return (
      <AuthCard title="One moment" accent="checking your session">
        <p className="text-sm text-white/90">Loading…</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      accent="make it yours"
      subtitle={<>You&apos;re signed in with a temporary password. Choose your own to continue.</>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          onDark
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          hint={`At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number.`}
        />
        <TextField
          onDark
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error ? (
          <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <PillButton type="submit" loading={isLoading} className="w-full">
          {isLoading ? "Saving..." : "Save password"}
        </PillButton>
      </form>
    </AuthCard>
  );
}
