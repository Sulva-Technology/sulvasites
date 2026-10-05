"use client";

import { useEffect, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";
import { useShellHero } from "@/components/ui/AppShell";
import { PillButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { PageHero } from "@/components/ui/PageHero";
import { StatusPill } from "@/components/ui/StatusPill";

type AdminUserRow = {
  user_id: string;
  created_at: string;
};

type AdminUserWithEmail = AdminUserRow & {
  email: string | null;
};

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadAdmins();
  }, []);

  async function loadCurrentUser() {
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setUserId(user.id); // Pre-fill the form with current user ID
    }
  }

  async function loadAdmins() {
    setIsLoading(true);
    setError(null);

    let authenticatedSupabase;
    try {
      // Ensure client is fully authenticated before making database call
      authenticatedSupabase = await getAuthenticatedClient();
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Session error. Please log in again.");
      return;
    }

    const supabase = authenticatedSupabase;

    try {
      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id, created_at")
        .order("created_at", { ascending: false });

      if (adminError) {
        setError(formatSupabaseError(adminError));
        setIsLoading(false);
        return;
      }

      const admins = (adminData ?? []) as AdminUserRow[];

      // Try to get emails - we'll show user_id for now
      const adminsWithEmail: AdminUserWithEmail[] = admins.map((admin) => ({
        ...admin,
        email: null,
      }));

      setAdminUsers(adminsWithEmail);
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreatedEmail(null);

    const trimmed = newEmail.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      const supabase = await getAuthenticatedClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCreateError(body.error ?? "Could not create user.");
        return;
      }

      setCreatedEmail(trimmed);
      setNewEmail("");
      loadAdmins();
    } catch (err) {
      setCreateError(formatSupabaseError(err));
    } finally {
      setIsCreating(false);
    }
  }

  async function onAddByUuid(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);

    if (!userId.trim()) {
      setAddError("Please enter a valid UUID.");
      return;
    }

    setIsAdding(true);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();

      const { error: insertError } = await supabase
        .from("admin_users")
        .insert({ user_id: userId.trim() });

      if (insertError) {
        if (insertError.code === "23505") {
          setAddError("This user is already an admin.");
        } else if (insertError.code === "23503") {
          setAddError(
            "User not found. Make sure the user exists in Supabase Auth first.",
          );
        } else {
          setAddError(formatSupabaseError(insertError));
        }
        return;
      }

      setAddSuccess(true);
      setUserId("");
      loadAdmins();
    } catch (err) {
      setAddError(formatSupabaseError(err));
    } finally {
      setIsAdding(false);
    }
  }

  async function onRemoveAdmin(userId: string) {
    if (!window.confirm("Remove admin access for this user?")) return;

    setRemovingId(userId);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();

      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("user_id", userId);

      if (error) {
        setError(formatSupabaseError(error));
        return;
      }

      loadAdmins();
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setRemovingId(null);
    }
  }

  useShellHero(
    <PageHero
      status={
        <StatusPill tone="live" onDark>
          {isLoading ? "Loading team…" : `${adminUsers.length} ${adminUsers.length === 1 ? "admin" : "admins"}`}
        </StatusPill>
      }
      title="Team & owners"
      accent="who runs what"
      subtitle="Manage who has admin access to this system."
      actions={
        <PillButton href="/admin/sites" variant="glass" arrow={false}>
          Back to sites
        </PillButton>
      }
    />,
  );

  return (
    <div className="space-y-6">
      {/* Admin Users List */}
      <Card>
        <CardHeader title="Admins" description="Everyone listed here can manage every site." />

        {error ? (
          <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-koi-ink/60">Loading…</p>
        ) : adminUsers.length === 0 ? (
          <p className="text-sm text-koi-ink/60">No admin users found.</p>
        ) : (
          <ul className="space-y-2">
            {adminUsers.map((admin) => (
              <li
                key={admin.user_id}
                className="flex flex-col gap-2 rounded-2xl bg-koi-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-koi-ink px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">
                      Admin
                    </span>
                    {admin.user_id === currentUserId ? (
                      <span className="rounded-full bg-koi-sea/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-koi-deep">
                        You
                      </span>
                    ) : null}
                    <code className="min-w-0 break-all font-mono text-xs text-koi-ink/80">{admin.user_id}</code>
                  </div>
                  <p className="mt-1 text-xs text-koi-ink/50">Added {new Date(admin.created_at).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveAdmin(admin.user_id)}
                  disabled={removingId === admin.user_id}
                  className="self-start rounded-full px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60 sm:self-auto"
                >
                  {removingId === admin.user_id ? "Removing..." : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create User Form */}
        <Card>
          <CardHeader
            title="Create user"
            description="Enter an email. The user is created with the default password and admin access, and must set their own password on first sign-in."
          />

          <form onSubmit={onCreateUser} className="space-y-4">
            <TextField
              label="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="teammate@company.com"
              autoComplete="off"
              required
            />

            {createError ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}

            {createdEmail ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Created {createdEmail}. Share the default password with them; they&apos;ll be
                asked to change it when they sign in.
              </div>
            ) : null}

            <PillButton type="submit" loading={isCreating} disabled={!newEmail.trim()}>
              {isCreating ? "Creating..." : "Create user"}
            </PillButton>
          </form>
        </Card>

        {/* Add Admin Form */}
        <Card>
          <CardHeader title="Add admin user" description="Enter the user's UUID from Supabase Auth to grant admin access." />
          {currentUserId ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-koi-sea/10 px-3 py-2 text-sm text-koi-deep">
              <strong>Your user ID:</strong>
              <code className="break-all font-mono text-xs">{currentUserId}</code>
              <PillButton
                variant="quiet"
                size="sm"
                onClick={() => {
                  setUserId(currentUserId);
                  onAddByUuid({ preventDefault: () => {} } as React.FormEvent);
                }}
              >
                Add myself as admin
              </PillButton>
            </div>
          ) : null}

          <form onSubmit={onAddByUuid} className="space-y-4">
            <TextField
              label="User UUID"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="123e4567-e89b-12d3-a456-426614174000"
              className="font-mono"
              hint="Find UUID in Supabase Dashboard → Authentication → Users"
            />

            {addError ? (
              <div role="alert" className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {addError}
              </div>
            ) : null}

            {addSuccess ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Admin user added successfully!
              </div>
            ) : null}

            <PillButton type="submit" loading={isAdding} disabled={!userId.trim()}>
              {isAdding ? "Adding..." : "Add admin"}
            </PillButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
