"use client";

import BlogManager from "@/components/blog/BlogManager";
import { useSite } from "@/components/dashboard/SiteShell";
import { NoAccess } from "@/components/shop-admin/common";
import { canEditBlog } from "@/lib/siteAccess";

export default function DashboardBlogPage() {
  const { siteId, role } = useSite();
  if (!canEditBlog(role)) return <NoAccess />;
  return <BlogManager siteId={siteId} basePath={`/dashboard/${siteId}/blog`} />;
}
