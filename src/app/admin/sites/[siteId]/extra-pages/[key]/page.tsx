"use client";

import { useParams } from "next/navigation";

import ExtraPageEditor from "@/components/site-editor/ExtraPageEditor";

export default function ExtraPageEditorPage() {
  const params = useParams();
  const siteId = typeof params?.siteId === "string" ? params.siteId : "";
  const key = typeof params?.key === "string" ? params.key : "";
  return <ExtraPageEditor siteId={siteId} pageKey={key} mode="admin" basePath={`/admin/sites/${siteId}`} />;
}
