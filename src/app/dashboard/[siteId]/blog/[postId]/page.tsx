"use client";

import { useParams } from "next/navigation";

import PostEditor from "@/components/blog/PostEditor";
import { useSite } from "@/components/dashboard/SiteShell";
import { NoAccess } from "@/components/shop-admin/common";
import { canEditBlog } from "@/lib/siteAccess";

export default function DashboardBlogPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { siteId, role } = useSite();
  if (!canEditBlog(role)) return <NoAccess />;
  return <PostEditor siteId={siteId} postId={String(postId)} basePath={`/dashboard/${siteId}/blog`} />;
}
