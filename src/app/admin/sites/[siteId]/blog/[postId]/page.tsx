import PostEditor from "@/components/blog/PostEditor";
import RequireAdmin from "@/components/RequireAdmin";

export default async function Page({ params }: { params: Promise<{ siteId: string; postId: string }> }) {
  const { siteId, postId } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Blog post</h1>
      <PostEditor siteId={siteId} postId={postId} basePath={`/admin/sites/${siteId}/blog`} />
    </RequireAdmin>
  );
}
