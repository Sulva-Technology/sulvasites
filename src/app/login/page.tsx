"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { resolvePostLoginRoute } from "@/lib/loginRouting";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { AuthCard } from "@/components/ui/AuthCard";
import { PillButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = supabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setIsLoading(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(await resolvePostLoginRoute(supabase));
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Sign in failed.");
    }
  }

  return (
    <AuthCard title="Welcome back" accent="to Sulva Sites" subtitle="Sign in to manage your site.">
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
        <TextField
          onDark
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error ? (
          <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <PillButton type="submit" loading={isLoading} className="w-full">
          {isLoading ? "Signing in..." : "Sign in"}
        </PillButton>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-white/80 underline underline-offset-4 hover:text-white">
            Forgot password?
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
