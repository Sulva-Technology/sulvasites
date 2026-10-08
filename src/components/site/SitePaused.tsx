export default function SitePaused({ name }: { name: string }) {
  return (
    <main
      style={{
        minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px",
        background: "#f4f7fc", color: "#0a0f1f", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <p style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#0a4fe0", margin: 0 }}>
          Temporarily unavailable
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "12px 0" }}>{name} is taking a short break</h1>
        <p style={{ color: "rgba(10,15,31,.7)", margin: 0 }}>Please check back soon.</p>
        <p style={{ marginTop: 28, fontSize: 13 }}>
          <a href="/login" style={{ color: "#0a4fe0" }}>Site owner? Sign in to reactivate</a>
        </p>
      </div>
    </main>
  );
}
