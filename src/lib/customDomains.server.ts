import { NextResponse } from "next/server";

import { platformDomain } from "./hostSite";
import { supabaseService } from "./supabase/admin.server";
import {
  VercelApiError,
  createVercelClient,
  dnsRecordsFor,
  domainIsLive,
  validateCustomHostname,
  vercelConfigFromEnv,
  type DnsRecord,
  type VercelClient,
} from "./vercelDomains";

const NO_STORE = { "Cache-Control": "no-store" };
const COLUMNS = "id, site_id, hostname, status, created_at";

type DomainRow = { id: string; site_id: string; hostname: string; status: "pending" | "active" | "blocked"; created_at: string };

/** What the admin UI shows for one domain. `vercel: false` means the API isn't configured (manual mode). */
export type DomainState = {
  domain: DomainRow;
  vercel: boolean;
  live: boolean;
  records: DnsRecord[];
  message?: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function vercelClient(): VercelClient | null {
  const cfg = vercelConfigFromEnv(process.env);
  return cfg ? createVercelClient(cfg) : null;
}

function vercelMessage(e: unknown) {
  if (e instanceof VercelApiError) {
    if (e.status === 401 || e.status === 403) return "Vercel rejected the API token. Check VERCEL_API_TOKEN and VERCEL_TEAM_ID.";
    return `Vercel: ${e.message}`;
  }
  return "Could not reach Vercel. Try again.";
}

/** Older rows were saved unvalidated; never let one of those touch the platform's own Vercel domains. */
function isManageable(hostname: string) {
  const valid = validateCustomHostname(hostname, platformDomain());
  return valid.ok && valid.hostname === hostname;
}

async function loadRow(siteId: string, domainId: string): Promise<DomainRow | null> {
  const { data, error } = await supabaseService()
    .from("domains")
    .select(COLUMNS)
    .eq("id", domainId)
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DomainRow | null) ?? null;
}

/**
 * Reads Vercel's view of the domain (retrying TXT verification when needed) and flips a pending
 * row to active once Vercel can serve it. Blocked rows stay blocked.
 */
async function syncState(vercel: VercelClient, row: DomainRow): Promise<DomainState> {
  if (!isManageable(row.hostname)) {
    return { domain: row, vercel: true, live: false, records: [], message: "This hostname can't be managed as a custom domain." };
  }
  let project = await vercel.getDomain(row.hostname);
  if (!project) {
    project = await vercel.addDomain(row.hostname);
  } else if (!project.verified) {
    project = (await vercel.verifyDomain(row.hostname)) ?? project;
  }
  const config = await vercel.getConfig(row.hostname);
  const live = domainIsLive(project, config);
  const records = dnsRecordsFor(row.hostname, project.apexName || row.hostname, config, project.verification);

  let domain = row;
  if (live && row.status === "pending") {
    const { data, error } = await supabaseService()
      .from("domains")
      .update({ status: "active" })
      .eq("id", row.id)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    domain = data as DomainRow;
  }
  return { domain, vercel: true, live, records };
}

/** POST: claim the hostname for this site, register it (and www for an apex) on the Vercel project. */
export async function connectDomain(req: Request, siteId: string) {
  let raw = "";
  try {
    raw = String(((await req.json()) as { hostname?: unknown }).hostname ?? "");
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const valid = validateCustomHostname(raw, platformDomain());
  if (!valid.ok) return json({ error: valid.error }, 400);
  const hostname = valid.hostname;

  const service = supabaseService();
  const { data, error } = await service
    .from("domains")
    .insert({ site_id: siteId, hostname, status: "pending" })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") return json({ error: "That domain is already connected to a site." }, 409);
    console.error("connectDomain insert failed:", error.message);
    return json({ error: "Could not save the domain." }, 500);
  }
  const row = data as DomainRow;

  const vercel = vercelClient();
  if (!vercel) {
    const state: DomainState = {
      domain: row,
      vercel: false,
      live: false,
      records: [],
      message: "Vercel API isn't configured: add the domain to the Vercel project by hand, then mark it Active.",
    };
    return json(state);
  }

  try {
    const project = await vercel.addDomain(hostname);
    if (project.apexName === hostname) await vercel.addDomain(`www.${hostname}`, hostname);
    return json(await syncState(vercel, row));
  } catch (e) {
    console.error("connectDomain Vercel failed:", e);
    // Don't leave a row claiming a hostname Vercel won't serve.
    await service.from("domains").delete().eq("id", row.id);
    await vercel.removeDomain(hostname).catch(() => {});
    return json({ error: vercelMessage(e) }, 502);
  }
}

/** PATCH { domainId }: re-check DNS / verification with Vercel; activates the domain once it's live. */
export async function checkDomain(req: Request, siteId: string) {
  let domainId = "";
  try {
    domainId = String(((await req.json()) as { domainId?: unknown }).domainId ?? "");
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  try {
    const row = await loadRow(siteId, domainId);
    if (!row) return json({ error: "Domain not found." }, 404);
    const vercel = vercelClient();
    if (!vercel) {
      return json({ domain: row, vercel: false, live: false, records: [] } satisfies DomainState);
    }
    return json(await syncState(vercel, row));
  } catch (e) {
    console.error("checkDomain failed:", e);
    return json({ error: vercelMessage(e) }, 502);
  }
}

/** DELETE { domainId }: detach from Vercel (apex + www) and remove the row. */
export async function removeDomain(req: Request, siteId: string) {
  let domainId = "";
  try {
    domainId = String(((await req.json()) as { domainId?: unknown }).domainId ?? "");
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  try {
    const row = await loadRow(siteId, domainId);
    if (!row) return json({ error: "Domain not found." }, 404);
    const vercel = vercelClient();
    if (vercel && isManageable(row.hostname)) {
      await vercel.removeDomain(row.hostname);
      await vercel.removeDomain(`www.${row.hostname}`);
    }
    const { error } = await supabaseService().from("domains").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (e) {
    console.error("removeDomain failed:", e);
    return json({ error: e instanceof VercelApiError ? vercelMessage(e) : "Could not remove the domain." }, 502);
  }
}
