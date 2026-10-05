import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { validateNewPassword } from "@/lib/passwordPolicy";
import { defaultNewUserPassword, supabaseService } from "@/lib/supabase/admin.server";

/**
 * Sets a new password for the signed-in user and clears the must-change flag.
 * Done server-side so the flag can't be cleared without actually changing the password.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 500 });
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await anon.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Session invalid or expired. Please log in again." }, { status: 401 });
  }

  let password = "";
  try {
    password = ((await req.json()) as { password?: string }).password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const invalid = validateNewPassword(password, defaultNewUserPassword());
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { error } = await supabaseService().auth.admin.updateUserById(userData.user.id, {
      password,
      app_metadata: { ...userData.user.app_metadata, must_change_password: false },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Password change failed." },
      { status: 500 },
    );
  }
}
