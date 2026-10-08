import type { Faq as FaqItem } from "@/lib/marketing/content";

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-koi-ink/10 rounded-3xl bg-white ring-1 ring-koi-ink/5">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.q}
            <span className="text-koi-deep transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm text-koi-ink/70">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
