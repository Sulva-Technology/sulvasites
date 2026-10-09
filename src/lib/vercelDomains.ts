// Vercel project-domain API wrapper + pure helpers for custom domains. No Next.js or `@/` imports,
// so it's unit-testable with the Node test runner.

export type VercelConfig = { token: string; projectId: string; teamId?: string };

export type VercelChallenge = { type: string; domain: string; value: string; reason?: string };

export type VercelProjectDomain = {
  name: string;
  apexName: string;
  verified: boolean;
  redirect?: string | null;
  verification?: VercelChallenge[];
};

export type VercelDomainConfig = {
  misconfigured: boolean;
  recommendedIPv4?: { rank: number; value: string[] }[];
  recommendedCNAME?: { rank: number; value: string }[];
};

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string };

const DEFAULT_A = "76.76.21.21";
const DEFAULT_CNAME = "cname.vercel-dns.com";
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

export function vercelConfigFromEnv(env: Record<string, string | undefined>): VercelConfig | null {
  const token = (env.VERCEL_API_TOKEN || env.VERCEL_TOKEN || "").trim();
  const projectId = (env.VERCEL_PROJECT_ID || "").trim();
  if (!token || !projectId) return null;
  const teamId = (env.VERCEL_TEAM_ID || "").trim();
  return teamId ? { token, projectId, teamId } : { token, projectId };
}

/** Normalises what an admin typed (URL, www., trailing dot) and rejects hosts we can't serve. */
export function validateCustomHostname(
  raw: string,
  platformDomain: string,
): { ok: true; hostname: string } | { ok: false; error: string } {
  let h = raw.trim().toLowerCase();
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  h = h.split("/")[0]!.split("?")[0]!.split("#")[0]!.split(":")[0]!;
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (h.startsWith("www.")) h = h.slice(4);
  if (!h) return { ok: false, error: "Enter a domain, e.g. kingsbakery.com." };

  const labels = h.split(".");
  if (h.length > 253 || labels.length < 2 || !labels.every((l) => LABEL_RE.test(l)) || !TLD_RE.test(labels.at(-1)!)) {
    return { ok: false, error: "That doesn't look like a valid domain." };
  }

  const platform = platformDomain.trim().toLowerCase();
  if (h === platform || h.endsWith(`.${platform}`)) {
    return { ok: false, error: "Platform addresses are added automatically; enter the client's own domain." };
  }
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".vercel.app")) {
    return { ok: false, error: "That domain can't be used as a custom domain." };
  }
  return { ok: true, hostname: h };
}

function topRanked<T extends { rank: number }>(list: T[] | undefined): T | undefined {
  return [...(list ?? [])].sort((a, b) => a.rank - b.rank)[0];
}

/** Name of `host` relative to its apex, as DNS panels expect ("@" for the apex itself). */
function relativeName(host: string, apex: string) {
  if (host === apex) return "@";
  return host.endsWith(`.${apex}`) ? host.slice(0, -1 * `.${apex}`.length) : host;
}

/** DNS records the domain owner must add: A for an apex (+ www CNAME), CNAME for a subdomain, plus any TXT challenges. */
export function dnsRecordsFor(
  hostname: string,
  apexName: string,
  config: VercelDomainConfig | null,
  challenges: VercelChallenge[] = [],
): DnsRecord[] {
  const a = topRanked(config?.recommendedIPv4)?.value?.[0] || DEFAULT_A;
  const cname = (topRanked(config?.recommendedCNAME)?.value || DEFAULT_CNAME).replace(/\.$/, "");

  const records: DnsRecord[] =
    hostname === apexName
      ? [
          { type: "A", name: "@", value: a },
          { type: "CNAME", name: "www", value: cname },
        ]
      : [{ type: "CNAME", name: relativeName(hostname, apexName), value: cname }];

  const seen = new Set<string>();
  for (const c of challenges) {
    if (c.type.toUpperCase() !== "TXT") continue;
    const rec: DnsRecord = { type: "TXT", name: relativeName(c.domain, apexName), value: c.value };
    const key = `${rec.name}|${rec.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(rec);
  }
  return records;
}

/** Vercel will serve the domain once it's verified for the project and DNS points at Vercel. */
export function domainIsLive(
  domain: Pick<VercelProjectDomain, "verified"> | null,
  config: Pick<VercelDomainConfig, "misconfigured"> | null,
) {
  return Boolean(domain?.verified && config && !config.misconfigured);
}

export class VercelApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export function createVercelClient(cfg: VercelConfig, fetchFn: FetchFn = fetch) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(`https://api.vercel.com${path}`);
    if (cfg.teamId) url.searchParams.set("teamId", cfg.teamId);
    const res = await fetchFn(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    if (!res.ok) {
      throw new VercelApiError(data.error?.message || `Vercel API ${res.status}`, res.status, data.error?.code);
    }
    return data as T;
  }

  const project = `/v9/projects/${encodeURIComponent(cfg.projectId)}/domains`;
  const one = (name: string) => `${project}/${encodeURIComponent(name)}`;

  async function getDomain(name: string): Promise<VercelProjectDomain | null> {
    try {
      return await call<VercelProjectDomain>("GET", one(name));
    } catch (e) {
      if (e instanceof VercelApiError && e.status === 404) return null;
      throw e;
    }
  }

  return {
    getDomain,

    /** Adds the domain to the project; if it's already there, returns the existing entry. */
    async addDomain(name: string, redirect?: string): Promise<VercelProjectDomain> {
      try {
        return await call<VercelProjectDomain>(
          "POST",
          `/v10/projects/${encodeURIComponent(cfg.projectId)}/domains`,
          redirect ? { name, redirect, redirectStatusCode: 308 } : { name },
        );
      } catch (e) {
        if (e instanceof VercelApiError && (e.status === 400 || e.status === 409)) {
          const existing = await getDomain(name);
          if (existing) return existing;
        }
        throw e;
      }
    },

    async verifyDomain(name: string): Promise<VercelProjectDomain | null> {
      try {
        return await call<VercelProjectDomain>("POST", `${one(name)}/verify`);
      } catch (e) {
        // Still unverified (TXT not found yet): report the current state instead of failing.
        if (e instanceof VercelApiError && e.status === 400) return getDomain(name);
        throw e;
      }
    },

    getConfig(name: string): Promise<VercelDomainConfig> {
      const q = `?projectIdOrName=${encodeURIComponent(cfg.projectId)}`;
      return call<VercelDomainConfig>("GET", `/v6/domains/${encodeURIComponent(name)}/config${q}`);
    },

    async removeDomain(name: string): Promise<void> {
      try {
        await call("DELETE", one(name));
      } catch (e) {
        if (e instanceof VercelApiError && e.status === 404) return;
        throw e;
      }
    },
  };
}

export type VercelClient = ReturnType<typeof createVercelClient>;
