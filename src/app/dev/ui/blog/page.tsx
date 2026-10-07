import { notFound } from "next/navigation";

import BlogEditorDemo from "./BlogEditorDemo";

/** Dev-only: the blog post editor inside the koi shell, without auth or a database. Disabled in production. */
export default function DevBlogEditorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BlogEditorDemo />;
}
