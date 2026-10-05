"use client";

import { useEffect, useState } from "react";

import LogoSection, { type AssetRow } from "@/components/admin/site/LogoSection";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { getAuthenticatedClient } from "@/lib/supabase/browser";
import type { SiteEditorProps } from "./types";

type ProfileRow = {
  site_id: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  socials: Record<string, unknown> | null;
  logo_asset_id: string | null;
};

type SocialInputs = {
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
};

/**
 * Logo + business profile form. Everything here is editable by owners too
 * (colours, slug, template and status live elsewhere), so `mode`/`basePath` need no gating.
 */
export default function ProfileEditor({ siteId }: SiteEditorProps) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [logoAsset, setLogoAsset] = useState<AssetRow | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    tagline: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    whatsapp: "",
  });

  const [socials, setSocials] = useState<SocialInputs>({
    instagram: "",
    facebook: "",
    twitter: "",
    tiktok: "",
  });

  useEffect(() => {
    if (!siteId) {
      setLoadError("Invalid site ID");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      setLogoLoadError(null);

      let authenticatedSupabase;
      try {
        // Ensure client is fully authenticated before making database calls
        authenticatedSupabase = await getAuthenticatedClient();
      } catch (err) {
        if (!isMounted) return;
        setIsLoading(false);
        setLoadError(err instanceof Error ? err.message : "Session error. Please log in again.");
        return;
      }

      const profileRes = await authenticatedSupabase
        .from("business_profiles")
        .select(
          "site_id, business_name, tagline, description, address, phone, email, whatsapp, socials, logo_asset_id",
        )
        .eq("site_id", siteId)
        .single();

      if (!isMounted) return;
      setIsLoading(false);

      if (profileRes.error) {
        setLoadError(formatSupabaseError(profileRes.error));
        return;
      }

      const loadedProfile = profileRes.data as ProfileRow;
      setProfile(loadedProfile);

      setForm({
        business_name: loadedProfile.business_name ?? "",
        tagline: loadedProfile.tagline ?? "",
        description: loadedProfile.description ?? "",
        address: loadedProfile.address ?? "",
        phone: loadedProfile.phone ?? "",
        email: loadedProfile.email ?? "",
        whatsapp: loadedProfile.whatsapp ?? "",
      });

      const s = (loadedProfile.socials ?? {}) as Record<string, unknown>;
      setSocials({
        instagram: typeof s.instagram === "string" ? s.instagram : "",
        facebook: typeof s.facebook === "string" ? s.facebook : "",
        twitter: typeof s.twitter === "string" ? s.twitter : "",
        tiktok: typeof s.tiktok === "string" ? s.tiktok : "",
      });

      if (loadedProfile.logo_asset_id) {
        const { data: asset, error: assetError } = await authenticatedSupabase
          .from("assets")
          .select("id, path, mime_type, size_bytes, created_at")
          .eq("id", loadedProfile.logo_asset_id)
          .single();

        if (!isMounted) return;

        if (assetError) {
          setLogoLoadError(formatSupabaseError(assetError));
          setLogoAsset(null);
        } else {
          setLogoAsset(asset as AssetRow);
        }
      } else {
        setLogoAsset(null);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [siteId]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSaveSuccess(false);
    setSaveError(null);
    setIsSaving(true);

    try {
      // Ensure client is fully authenticated before making database call
      const supabase = await getAuthenticatedClient();
      const payload = {
        business_name: form.business_name.trim(),
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        // Keep extra keys templates store in socials (hours, nav_labels, footer_labels…).
        socials: {
          ...((profile?.socials ?? {}) as Record<string, unknown>),
          instagram: socials.instagram.trim() || null,
          facebook: socials.facebook.trim() || null,
          twitter: socials.twitter.trim() || null,
          tiktok: socials.tiktok.trim() || null,
        },
      };

      const { error } = await supabase
        .from("business_profiles")
        .update(payload)
        .eq("site_id", siteId);

      if (error) {
        setSaveError(formatSupabaseError(error));
        return;
      }

      setProfile((prev) => (prev ? { ...prev, socials: payload.socials } : prev));
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-sm text-gray-700">
        Profile not found (or you don&apos;t have access).
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* A3) Logo */}
        <LogoSection
          siteId={siteId}
          logoAsset={logoAsset}
          loadError={logoLoadError}
          onLogoChange={(asset) => {
            setLogoAsset(asset);
            setProfile((prev) => (prev ? { ...prev, logo_asset_id: asset?.id ?? null } : prev));
          }}
        />

        {/* B) Business Profile Editor */}
        <section className="rounded-lg bg-white p-6 ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold">Business profile</h2>
          <p className="mt-1 text-sm text-gray-600">
            These fields power the public website template.
          </p>
  
          <form onSubmit={onSaveProfile} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-800">
                  Business name
                </span>
                <input
                  value={form.business_name}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, business_name: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  required
                />
              </label>
  
              <label className="block">
                <span className="text-sm font-medium text-gray-800">Tagline</span>
                <input
                  value={form.tagline}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, tagline: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                />
              </label>
            </div>
  
            <label className="block">
              <span className="text-sm font-medium text-gray-800">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((v) => ({ ...v, description: e.target.value }))
                }
                rows={5}
                className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              />
            </label>
  
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-800">Address</span>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, address: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                />
              </label>
  
              <label className="block">
                <span className="text-sm font-medium text-gray-800">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                />
              </label>
  
              <label className="block">
                <span className="text-sm font-medium text-gray-800">Email</span>
                <input
                  value={form.email}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, email: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                />
              </label>
  
              <label className="block">
                <span className="text-sm font-medium text-gray-800">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, whatsapp: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                />
              </label>
            </div>
  
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-900">Socials</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-800">
                    Instagram
                  </span>
                  <input
                    value={socials.instagram}
                    onChange={(e) =>
                      setSocials((v) => ({ ...v, instagram: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="https://instagram.com/..."
                  />
                </label>
  
                <label className="block">
                  <span className="text-sm font-medium text-gray-800">
                    Facebook
                  </span>
                  <input
                    value={socials.facebook}
                    onChange={(e) =>
                      setSocials((v) => ({ ...v, facebook: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="https://facebook.com/..."
                  />
                </label>
  
                <label className="block">
                  <span className="text-sm font-medium text-gray-800">Twitter</span>
                  <input
                    value={socials.twitter}
                    onChange={(e) =>
                      setSocials((v) => ({ ...v, twitter: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="https://x.com/..."
                  />
                </label>
  
                <label className="block">
                  <span className="text-sm font-medium text-gray-800">TikTok</span>
                  <input
                    value={socials.tiktok}
                    onChange={(e) =>
                      setSocials((v) => ({ ...v, tiktok: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="https://tiktok.com/@..."
                  />
                </label>
              </div>
            </div>
  
            {saveError ? (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            ) : null}
            {saveSuccess ? (
              <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Saved.
              </div>
            ) : null}
  
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>
    </div>
  );
}
