/**
 * Best-effort client IP for rate-limit keys. Prefers `x-real-ip` (set by the platform/proxy),
 * then the first `x-forwarded-for` entry. Spoofable behind a proxy that doesn't overwrite these
 * headers, so callers must also apply a global (non-IP) limit.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd.slice(0, 64);
  return "unknown";
}
