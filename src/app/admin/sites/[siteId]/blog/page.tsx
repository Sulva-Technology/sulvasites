import BlogManager from "@/components/blog/BlogManager";
import RequireAdmin from "@/components/RequireAdmin";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Blog</h1>
      <BlogManager siteId={siteId} basePath={`/admin/sites/${siteId}/blog`} />
    </RequireAdmin>
  );
}
