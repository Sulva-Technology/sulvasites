import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UserCheck = { ok: true; userId: string; email: string } | { ok: false; response: NextResponse };

const fail = (error: string, status: number): UserCheck => ({ ok: false, response: NextResponse.json({ error }, { status }) });

/** Any signed-in user (Authorization: Bearer <supabase access token>) with a confirmed email. */
export async function requireUser(req: Request): Promise<UserCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fail("Supabase is not configured on the server.", 500);
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return fail("Not signed in.", 401);
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return fail("Session invalid or expired. Please sign in again.", 401);
  if (!data.user.email || !data.user.email_confirmed_at) return fail("Confirm your email first.", 403);
  return { ok: true, userId: data.user.id, email: data.user.email };
}
