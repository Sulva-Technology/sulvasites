import { NextResponse } from "next/server";

import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";
import { defaultNewUserPassword, supabaseService } from "@/lib/supabase/admin.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a user with the shared default password, flags them to change it on
 * first login, and grants admin access (this app is team-only).
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req, { superOnly: true });
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`create-user:${auth.userId}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const service = supabaseService();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: defaultNewUserPassword(),
      email_confirm: true,
      app_metadata: { must_change_password: true },
    });
    if (error || !data.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      return NextResponse.json(
        { error: exists ? "A user with this email already exists." : (error?.message ?? "Create failed.") },
        { status: exists ? 409 : 400 },
      );
    }

    const { error: adminError } = await service
      .from("admin_users")
      .insert({ user_id: data.user.id });
    if (adminError) {
      await service.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.user.id, email });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed." },
      { status: 500 },
    );
  }
}
