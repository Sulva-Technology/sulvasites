import { SULVA_MARK_PATH } from "@/components/ui/Logo";

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "sulvasites.sulvatech.com";

/** Shown on Starter and trial sites. Inline styles so template CSS can't hide or restyle it. */
export default function SulvaBadge() {
  return (
    <a
      href={`https://${PLATFORM}/?ref=badge`}
      target="_blank"
      rel="noopener"
      style={{
        position: "fixed", left: 12, bottom: 12, zIndex: 2147483000, display: "inline-flex", alignItems: "center",
        gap: 6, padding: "6px 12px", borderRadius: 999, background: "rgba(10,15,31,.88)", color: "#fff",
        font: "500 12px/1.2 system-ui, -apple-system, Segoe UI, sans-serif", textDecoration: "none",
        boxShadow: "0 6px 20px -8px rgba(0,0,0,.45)",
      }}
    >
      <svg viewBox="0 0 274 329" width="10" height="12" fill="currentColor" aria-hidden="true">
        <path d={SULVA_MARK_PATH} />
      </svg>
      Built with <strong style={{ fontWeight: 650 }}>Sulva Sites</strong>
    </a>
  );
}
