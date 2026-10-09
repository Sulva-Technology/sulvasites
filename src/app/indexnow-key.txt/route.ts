import { indexNowKey } from "@/lib/search/indexNow.server";

export const dynamic = "force-dynamic";

/** IndexNow ownership proof. Middleware leaves this path alone, so every site host serves the same key. */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
