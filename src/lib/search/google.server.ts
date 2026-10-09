import { buildJwt, GOOGLE_TOKEN_URL, parseServiceAccount, type ServiceAccount } from "./googleJwt";
import { parseMetaToken } from "./searchPlan";

const SCOPES = ["https://www.googleapis.com/auth/webmasters", "https://www.googleapis.com/auth/siteverification"];
const SITE_VERIFICATION = "https://www.googleapis.com/siteVerification/v1";
const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SEARCH_SA_JSON;
  return raw ? parseServiceAccount(raw) : null;
}

/** Search Console property that covers the platform domain and every subdomain, e.g. "sc-domain:sulvasites.sulvatech.com". */
export function googleDomainProperty(): string | null {
  const p = process.env.GOOGLE_SEARCH_DOMAIN_PROPERTY?.trim();
  return p ? p : null;
}

export function googleConfigured(): boolean {
  return !!serviceAccount() && !!googleDomainProperty();
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const sa = serviceAccount();
  if (!sa) throw new Error("Google search credentials are not configured.");
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: buildJwt(sa, SCOPES, Math.floor(Date.now() / 1000)),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Google auth ${res.status}: ${body.error_description || "no access token"}`);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

async function call<T>(method: "GET" | "POST" | "PUT", url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    const message = (parsed as { error?: { message?: string } }).error?.message || text.slice(0, 200) || res.statusText;
    throw new Error(`Google ${res.status}: ${message}`);
  }
  return parsed as T;
}

const siteResource = (host: string) => ({ type: "SITE", identifier: `https://${host}/` });

/** Content value for the host's <meta name="google-site-verification"> tag. */
export async function getMetaToken(host: string): Promise<string> {
  const res = await call<{ token?: string }>("POST", `${SITE_VERIFICATION}/token`, {
    verificationMethod: "META",
    site: siteResource(host),
  });
  const token = res.token ? parseMetaToken(res.token) : null;
  if (!token) throw new Error("Google returned no verification token.");
  return token;
}

/** Asks Google to fetch the home page and find the meta tag; makes the service account an owner. */
export async function verifySite(host: string): Promise<void> {
  await call("POST", `${SITE_VERIFICATION}/webResource?verificationMethod=META`, { site: siteResource(host) });
}

export async function addSite(siteUrl: string): Promise<void> {
  await call("PUT", `${WEBMASTERS}/sites/${encodeURIComponent(siteUrl)}`);
}

export async function submitSitemap(siteUrl: string, feedUrl: string): Promise<void> {
  await call("PUT", `${WEBMASTERS}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedUrl)}`);
}
