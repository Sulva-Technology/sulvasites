import { blogFeedResponse } from "@/lib/blog/feed.server";

export async function GET(_req: Request, { params }: { params: Promise<{ hostname: string }> }) {
  const { hostname } = await params;
  return blogFeedResponse("hostname", hostname);
}
