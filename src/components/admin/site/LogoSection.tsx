"use client";

import { useState } from "react";

import { getPublicAssetUrl, uploadLogo } from "@/lib/assets";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import { formatSupabaseError } from "@/lib/supabase/formatError";

export type AssetRow = {
  id: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export default function LogoSection({
  siteId,
  logoAsset,
  loadError,
  onLogoChange,
}: {
  siteId: string;
  logoAsset: AssetRow | null;
  /** Error from loading the current logo asset, shown until the next action. */
  loadError: string | null;
  onLogoChange: (asset: AssetRow | null) => void;
}) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(loadError);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);

  const logoUrl = logoAsset ? getPublicAssetUrl(logoAsset.path) : null;

  async function onUploadLogo() {
    setLogoError(null);
    setLogoSuccess(null);

    if (!logoFile) {
      setLogoError("Please choose a file first.");
      return;
    }

    setIsLogoUploading(true);
    try {
      // uploadLogo already ensures authentication
      const asset = await uploadLogo(siteId, logoFile);
      onLogoChange(asset);
      setLogoSuccess("Logo uploaded.");
      setLogoFile(null);
    } catch (err) {
      setLogoError(formatSupabaseError(err));
    } finally {
      setIsLogoUploading(false);
    }
  }

  async function onRemoveLogo() {
    if (!window.confirm("Remove logo from this site?")) return;
    setLogoError(null);
    setLogoSuccess(null);
    setIsLogoUploading(true);

    try {
      const supabase = await getAuthenticatedClient();
      const { error } = await supabase
        .from("business_profiles")
        .update({ logo_asset_id: null })
        .eq("site_id", siteId);
      if (error) throw error;

      onLogoChange(null);
      // MVP: do NOT delete the storage file to avoid breaking references.
      setLogoSuccess("Logo removed.");
    } catch (err) {
      setLogoError(formatSupabaseError(err));
    } finally {
      setIsLogoUploading(false);
    }
  }

  return (
    <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold">Logo</h2>
      <p className="mt-1 text-sm text-gray-600">
        Upload a logo (stored in Supabase Storage: bucket <span className="font-mono">site-assets</span>).
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="block text-sm"
          />
          <button
            type="button"
            onClick={onUploadLogo}
            disabled={isLogoUploading}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isLogoUploading ? "Uploading…" : "Upload logo"}
          </button>
        </div>

        {logoUrl ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRemoveLogo}
              disabled={isLogoUploading}
              className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
            >
              Remove logo
            </button>
          </div>
        ) : null}
      </div>

      {logoError ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {logoError}
        </div>
      ) : null}
      {logoSuccess ? (
        <div className="mt-3 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {logoSuccess}
        </div>
      ) : null}

      <div className="mt-4">
        {logoUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Site logo"
              className="h-16 w-16 rounded bg-white object-contain ring-1 ring-gray-200"
            />
            <div className="text-xs text-gray-600">
              <div>
                <span className="font-medium">Asset ID:</span>{" "}
                <span className="font-mono">{logoAsset?.id ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium">Path:</span>{" "}
                <span className="font-mono">{logoAsset?.path ?? "—"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No logo uploaded.</div>
        )}
      </div>
    </section>
  );
}
