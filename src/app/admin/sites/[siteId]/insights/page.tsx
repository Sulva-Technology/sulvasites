import RequireAdmin from "@/components/RequireAdmin";
import InsightsView from "@/components/insights/InsightsView";

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return (
    <RequireAdmin>
      <h1 className="sr-only">Insights</h1>
      <InsightsView siteId={siteId} />
    </RequireAdmin>
  );
}
