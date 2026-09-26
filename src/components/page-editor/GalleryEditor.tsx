"use client";

import type { GallerySection } from "@/lib/pageSchema";

import ImageField from "./ImageField";

export default function GalleryEditor({
  value,
  onChange,
}: {
  value: GallerySection;
  onChange: (next: GallerySection) => void;
}) {
  const images = value.images ?? [];

  function updateImage(idx: number, patch: Partial<(typeof images)[number]>) {
    const next = images.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...value, images: next });
  }

  function addImage() {
    onChange({ ...value, images: [...images, { url: "", alt: "" }] });
  }

  function removeImage(idx: number) {
    onChange({ ...value, images: images.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-800">Title</span>
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          placeholder="Our Gallery"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-700">
          Images ({images.length})
        </div>
        <button
          type="button"
          onClick={addImage}
          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Add image
        </button>
      </div>

      <div className="space-y-3">
        {images.length === 0 ? (
          <div className="text-sm text-gray-600">No images.</div>
        ) : (
          images.map((it, idx) => (
            <div
              key={idx}
              className="rounded border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-900">
                  Image {idx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="text-sm font-medium text-red-700 hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ImageField
                    label="Image"
                    value={it.url}
                    onChange={(url) => updateImage(idx, { url })}
                    onPick={(url, alt) => updateImage(idx, { url, alt: it.alt || alt })}
                  />
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-800">
                    Alt Text
                  </span>
                  <input
                    value={it.alt}
                    onChange={(e) => updateImage(idx, { alt: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    placeholder="Description of image"
                  />
                </label>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
