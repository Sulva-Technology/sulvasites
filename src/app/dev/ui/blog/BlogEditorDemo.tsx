"use client";

import PostEditor from "@/components/blog/PostEditor";
import { AppShell } from "@/components/ui/AppShell";

export default function BlogEditorDemo() {
  return (
    <AppShell brand="Sulva Sites" brandHref="/dev/ui/blog" links={[{ href: "/dev/ui/blog", label: "Blog editor" }, { href: "/dev/ui", label: "Gallery" }]}>
      <PostEditor siteId="dev" postId="new" basePath="/dev/ui/blog" />
    </AppShell>
  );
}
