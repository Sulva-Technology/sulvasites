import { blogFeedResponse } from "@/lib/blog/feed.server";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return blogFeedResponse("slug", slug);
}
