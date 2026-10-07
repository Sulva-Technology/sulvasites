"use client";

import Link from "next/link";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { PillButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // The emailed link signs the user in and lands on /change-password to pick a new one.
      // Always use the platform origin: Supabase's redirect allowlist rejects tenant subdomains and custom domains.
      const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || window.location.origin).replace(/\/+$/, "");
      const { error: resetError } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/change-password`,
      });
      // Supabase returns no error for an unknown address, so showing real send failures (rate limit, SMTP down)
      // does not reveal which addresses have accounts.
      if (resetError) {
        setError(
          resetError.status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : "Could not send the email right now. Try again in a few minutes.",
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send the email. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" accent="for a reset link" subtitle="If that address has an account, a link to set a new password is on its way.">
        <Link href="/login" className="text-sm font-medium text-white underline underline-offset-4">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" accent="we'll email a link" subtitle="Enter the email you sign in with.">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          onDark
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
        {error ? (
          <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <PillButton type="submit" loading={isLoading} className="w-full">
          {isLoading ? "Sending…" : "Send reset link"}
        </PillButton>
        <p className="text-center text-sm">
          <Link href="/login" className="text-white/80 underline underline-offset-4 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
