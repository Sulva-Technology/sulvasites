import Link from "next/link";

export default function TemplateThumb({ templateKey, name, category }: { templateKey: string; name: string; category: string }) {
  return (
    <Link href={`/templates/${templateKey}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-koi-ink/10 transition group-hover:ring-koi-deep/40">
        <iframe
          src={`/templates/${templateKey}?thumb=1`}
          title={`${name} template preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span className="text-xs text-koi-ink/60">{category}</span>
      </div>
    </Link>
  );
}
