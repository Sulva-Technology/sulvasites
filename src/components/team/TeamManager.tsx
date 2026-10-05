"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, btnCls, btnDangerCls, inputCls, Notice } from "@/components/shop-admin/common";
import { canInvite, canRemove, type SiteRole } from "@/lib/siteAccess";

type Member = { userId: string; email: string; role: SiteRole; createdAt: string };

type Props = {
  siteId: string;
  /** "admin" uses the admin members route (can create accounts and invite owners); "owner" uses the site route. */
  actor: "admin" | "owner";
  /** The signed-in user's id, so an owner cannot remove themselves by accident. */
  currentUserId?: string;
};

export default function TeamManager({ siteId, actor, currentUserId }: Props) {
  const api =
    actor === "admin"
      ? `/api/admin/sites/${encodeURIComponent(siteId)}/members`
      : `/api/sites/${encodeURIComponent(siteId)}/members`;

  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SiteRole>("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ members?: Member[] }>(api);
    if (!res.ok) {
      setLoadError(res.data.error ?? "Could not load team.");
      return;
    }
    setLoadError(null);
    setMembers(res.data.members ?? []);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function reset() {
    setError(null);
    setNotFound(null);
    setOk(null);
    setWarn(null);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    reset();
    const target = actor === "owner" ? "staff" : role;
    if (!canInvite(actor, target)) return;
    setBusy(true);
    try {
      const res = await apiFetch<{
        email?: string;
        role?: SiteRole;
        created?: boolean;
        mustChangePassword?: boolean;
      }>(api, { method: "POST", body: JSON.stringify({ email: email.trim(), role: target }) });
      if (res.status === 404) {
        // Owners cannot create accounts; the server explains who can.
        setNotFound(res.data.error ?? "No account found for that email. Ask Sulvatech to create it.");
        return;
      }
      if (!res.ok) {
        setError(res.data.error ?? "Could not add member.");
        return;
      }
      setOk(`${res.data.email ?? email.trim()} added as ${target}.`);
      if (actor === "admin" && res.data.mustChangePassword) {
        setWarn(
          res.data.created
            ? "A new account was created with the temporary password. Share it separately; they must change it at first sign-in."
            : "This account still has a temporary password and must change it at next sign-in.",
        );
      }
      setEmail("");
      await load();
    } catch {
      setError("Could not add member.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: Member) {
    reset();
    if (!window.confirm(`Remove ${m.email || "this member"} from the site?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch<Record<string, never>>(api, {
        method: "DELETE",
        body: JSON.stringify({ userId: m.userId }),
      });
      if (!res.ok) {
        setError(res.data.error ?? "Could not remove member.");
        return;
      }
      setOk(`${m.email || "Member"} removed.`);
      await load();
    } catch {
      setError("Could not remove member.");
    } finally {
      setBusy(false);
    }
  }

  const ownerCount = (members ?? []).filter((m) => m.role === "owner").length;

  return (
    <div className="space-y-4">
      {loadError ? <Notice kind="error">{loadError}</Notice> : null}

      <ul className="divide-y divide-koi-ink/5 rounded-lg ring-1 ring-koi-ink/10">
        {members === null && !loadError ? <li className="px-4 py-3 text-sm text-koi-ink/60">Loading…</li> : null}
        {members?.length === 0 ? <li className="px-4 py-3 text-sm text-koi-ink/60">No team members yet.</li> : null}
        {(members ?? []).map((m) => {
          const verdict = canRemove(actor, { role: m.role, userId: m.userId }, {
            actorId: currentUserId ?? "",
            ownerCount,
          });
          const isSelf = currentUserId === m.userId;
          return (
            <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-koi-ink">
                  {m.email || m.userId}
                  {isSelf ? <span className="ml-2 text-xs text-koi-ink/55">(you)</span> : null}
                </div>
                <div className="text-xs text-koi-ink/55">{m.role}</div>
              </div>
              {verdict.ok && !isSelf ? (
                <button type="button" className={btnDangerCls} disabled={busy} onClick={() => remove(m)}>
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <form onSubmit={invite} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium text-koi-ink/80">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputCls} w-72`}
              placeholder="person@example.com"
            />
          </label>
          {actor === "admin" ? (
            <label className="block text-sm font-medium text-koi-ink/80">
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as SiteRole)} className={inputCls}>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          ) : null}
          <button type="submit" className={btnCls} disabled={busy || !email.trim()}>
            {busy ? "Working…" : actor === "owner" ? "Add staff member" : "Add member"}
          </button>
        </div>
        <p className="text-xs text-koi-ink/55">
          {actor === "owner"
            ? "Staff can see orders, the inbox and the business details, but cannot edit content. They need an existing account; Sulvatech creates accounts."
            : "Creates the account if the email is new. The temporary password is never shown here; share it separately."}
        </p>
      </form>

      {notFound ? <Notice kind="warn">{notFound}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {ok ? <Notice kind="ok">{ok}</Notice> : null}
      {warn ? <Notice kind="warn">{warn}</Notice> : null}
    </div>
  );
}
