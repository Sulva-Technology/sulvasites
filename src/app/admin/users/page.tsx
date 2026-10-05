"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/formatError";
import { supabaseBrowser, getAuthenticatedClient } from "@/lib/supabase/browser";

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Admin Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage who has admin access to this system.
          </p>
        </div>
        <Link
          href="/admin/sites"
          className="rounded bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Back to Sites
        </Link>
      </div>

      {/* Create User Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Create User</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter an email. The user is created with the default password and admin
          access, and must set their own password on first sign-in.
        </p>

        <form onSubmit={onCreateUser} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">Email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="teammate@company.com"
              autoComplete="off"
              required
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
          </label>

          {createError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          ) : null}

          {createdEmail ? (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Created {createdEmail}. Share the default password with them; they&apos;ll be
              asked to change it when they sign in.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isCreating || !newEmail.trim()}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      {/* Add Admin Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add Admin User</h2>
        {currentUserId ? (
          <div className="mt-2 rounded bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
            <strong>Your User ID:</strong>{" "}
            <code className="font-mono text-xs">{currentUserId}</code>
            <button
              onClick={() => {
                setUserId(currentUserId);
                onAddByUuid({ preventDefault: () => {} } as React.FormEvent);
              }}
              className="ml-3 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Add Myself as Admin
            </button>
          </div>
        ) : null}
        <p className="mt-1 text-sm text-gray-600">
          Enter the user&apos;s UUID from Supabase Auth to grant admin access.
        </p>

        <form onSubmit={onAddByUuid} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-800">User UUID</span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="123e4567-e89b-12d3-a456-426614174000"
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              Find UUID in Supabase Dashboard → Authentication → Users
            </p>
          </label>

          {addError ? (
            <div className="whitespace-pre-line rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {addError}
            </div>
          ) : null}

          {addSuccess ? (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Admin user added successfully!
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isAdding || !userId.trim()}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isAdding ? "Adding..." : "Add Admin"}
          </button>
        </form>
      </div>

      {/* Admin Users List */}
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {adminUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={3}>
                    No admin users found.
                  </td>
                </tr>
              ) : (
                adminUsers.map((admin) => (
                  <tr key={admin.user_id} className="bg-white">
                    <td className="px-4 py-3 font-mono text-xs">
                      {admin.user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(admin.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onRemoveAdmin(admin.user_id)}
                        disabled={removingId === admin.user_id}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                      >
                        {removingId === admin.user_id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
