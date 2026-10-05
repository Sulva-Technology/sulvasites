import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Verifies the request comes from a signed-in admin.
 *
 * Expects `Authorization: Bearer <supabase access token>`. The token is checked
 * with Supabase and `is_admin()` is evaluated as that user, so RLS rules apply.
 */
export async function requireAdmin(req: Request): Promise<AdminCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 500 },
      ),
    };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session invalid or expired. Please log in again." },
        { status: 401 },
      ),
    };
  }

  if (userData.user.app_metadata?.must_change_password) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Change your temporary password first." },
        { status: 403 },
      ),
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: userData.user.id };
}

// Best-effort per-user rate limit. In-memory, so it resets on cold starts and
// is per-instance on serverless — enough to stop accidental loops and casual abuse.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}
