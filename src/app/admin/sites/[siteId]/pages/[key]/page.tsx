"use client";

import { useParams } from "next/navigation";

import PageEditor from "@/components/site-editor/PageEditor";

export default function PageEditorPage() {
  const params = useParams();
  const siteId = typeof params?.siteId === "string" ? params.siteId : "";
  const key = typeof params?.key === "string" ? params.key : "";
  return <PageEditor siteId={siteId} pageKey={key} mode="admin" basePath={`/admin/sites/${siteId}`} />;
}
