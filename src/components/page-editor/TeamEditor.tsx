"use client";

import type { TeamSection } from "@/lib/pageSchema";

import ImageField from "./ImageField";

export default function TeamEditor({
  value,
  onChange,
}: {
  value: TeamSection;
  onChange: (next: TeamSection) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-800">Title</span>
          <input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-800">Subtitle</span>
          <input
            value={value.subtitle}
            onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          />
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Members</h3>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                members: [
                  ...value.members,
                  { name: "", role: "", bio: "", photoUrl: "", linkedinUrl: "" },
                ],
              })
            }
            className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Add member
          </button>
        </div>

        {value.members.length === 0 ? (
          <div className="text-sm text-gray-600">No members.</div>
        ) : (
          <div className="space-y-4">
            {value.members.map((m, idx) => (
              <div key={idx} className="rounded border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    Member {idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        members: value.members.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-sm font-medium text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-800">Name</span>
                    <input
                      value={m.name}
                      onChange={(e) => {
                        const members = value.members.map((x, i) =>
                          i === idx ? { ...x, name: e.target.value } : x
                        );
                        onChange({ ...value, members });
                      }}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-800">Role</span>
                    <input
                      value={m.role}
                      onChange={(e) => {
                        const members = value.members.map((x, i) =>
                          i === idx ? { ...x, role: e.target.value } : x
                        );
                        onChange({ ...value, members });
                      }}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-gray-800">Bio</span>
                    <textarea
                      value={m.bio}
                      onChange={(e) => {
                        const members = value.members.map((x, i) =>
                          i === idx ? { ...x, bio: e.target.value } : x
                        );
                        onChange({ ...value, members });
                      }}
                      rows={3}
                      className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <ImageField
                      label="Photo (optional)"
                      value={m.photoUrl ?? ""}
                      onChange={(url) => {
                        const members = value.members.map((x, i) =>
                          i === idx ? { ...x, photoUrl: url } : x
                        );
                        onChange({ ...value, members });
                      }}
                    />
                  </div>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-gray-800">
                      LinkedIn URL (optional)
                    </span>
                    <input
                      value={m.linkedinUrl ?? ""}
                      onChange={(e) => {
                        const members = value.members.map((x, i) =>
                          i === idx ? { ...x, linkedinUrl: e.target.value } : x
                        );
                        onChange({ ...value, members });
                      }}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

