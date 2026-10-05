import { NextResponse } from "next/server";

import { runAssistantTurn } from "@/lib/ai/assistant";
import { normalizeMessages } from "@/lib/ai/brief";
import { aiErrorResponse } from "@/lib/ai/http.server";
import { rateLimit, requireAdmin } from "@/lib/supabase/requireAdmin.server";

export const maxDuration = 60;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const limited = rateLimit(`ai-assistant:${auth.userId}`, { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const messages = normalizeMessages(b.messages);
  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return bad("Send at least one message, ending with the user's message.");
  }

  try {
    const turn = await runAssistantTurn({ messages, state: b.state });
    return NextResponse.json(turn, { status: 200 });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
