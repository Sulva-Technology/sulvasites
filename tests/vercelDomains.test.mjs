import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createVercelClient,
  dnsRecordsFor,
  domainIsLive,
  validateCustomHostname,
  vercelConfigFromEnv,
} from "../src/lib/vercelDomains.ts";

const P = "sulvasites.sulvatech.com";

test("validateCustomHostname normalises and accepts real domains", () => {
  assert.deepEqual(validateCustomHostname("  WWW.Kings-Bakery.com ", P), { ok: true, hostname: "kings-bakery.com" });
  assert.deepEqual(validateCustomHostname("https://shop.client.co.uk/about", P), { ok: true, hostname: "shop.client.co.uk" });
  assert.deepEqual(validateCustomHostname("client.com.", P), { ok: true, hostname: "client.com" });
});

test("validateCustomHostname rejects junk, platform and reserved hosts", () => {
  for (const bad of ["", "client", "-bad.com", "bad-.com", "a..com", "under_score.com", "1.2.3.4", "localhost", "x.localhost", "app.vercel.app", P, `bakery.${P}`]) {
    assert.equal(validateCustomHostname(bad, P).ok, false, bad);
  }
});

test("dnsRecordsFor: apex gets A + www CNAME, using Vercel's recommendations", () => {
  const records = dnsRecordsFor("client.com", "client.com", {
    misconfigured: true,
    recommendedIPv4: [{ rank: 1, value: ["76.76.21.99"] }],
    recommendedCNAME: [{ rank: 1, value: "abc.vercel-dns-017.com." }],
  });
  assert.deepEqual(records, [
    { type: "A", name: "@", value: "76.76.21.99" },
    { type: "CNAME", name: "www", value: "abc.vercel-dns-017.com" },
  ]);
});

test("dnsRecordsFor: subdomain gets a CNAME relative to the apex; defaults when no config", () => {
  assert.deepEqual(dnsRecordsFor("shop.client.co.uk", "client.co.uk", null), [
    { type: "CNAME", name: "shop", value: "cname.vercel-dns.com" },
  ]);
});

test("dnsRecordsFor: adds TXT challenges once, without the apex suffix", () => {
  const challenge = { type: "TXT", domain: "_vercel.client.com", value: "vc-domain-verify=client.com,abc", reason: "pending_domain_verification" };
  const records = dnsRecordsFor("client.com", "client.com", null, [challenge, challenge]);
  assert.deepEqual(records.at(-1), { type: "TXT", name: "_vercel", value: "vc-domain-verify=client.com,abc" });
  assert.equal(records.filter((r) => r.type === "TXT").length, 1);
});

test("domainIsLive needs a verified project domain and a correct DNS config", () => {
  assert.equal(domainIsLive({ verified: true }, { misconfigured: false }), true);
  assert.equal(domainIsLive({ verified: false }, { misconfigured: false }), false);
  assert.equal(domainIsLive({ verified: true }, { misconfigured: true }), false);
  assert.equal(domainIsLive(null, { misconfigured: false }), false);
});

test("vercelConfigFromEnv needs token and project", () => {
  assert.equal(vercelConfigFromEnv({}), null);
  assert.equal(vercelConfigFromEnv({ VERCEL_API_TOKEN: "t" }), null);
  assert.deepEqual(vercelConfigFromEnv({ VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "prj_1", VERCEL_TEAM_ID: "team_1" }), {
    token: "t",
    projectId: "prj_1",
    teamId: "team_1",
  });
});

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    const u = new URL(url);
    const key = `${init.method ?? "GET"} ${u.pathname}`;
    calls.push({ key, url: u, init });
    const hit = routes[key];
    if (!hit) return new Response(JSON.stringify({ error: { code: "not_found" } }), { status: 404 });
    return new Response(JSON.stringify(hit.body ?? {}), { status: hit.status ?? 200 });
  };
  return { fn, calls };
}

test("client.addDomain posts with team scope and bearer token", async () => {
  const { fn, calls } = fakeFetch({
    "POST /v10/projects/prj_1/domains": { body: { name: "client.com", apexName: "client.com", verified: true } },
  });
  const vercel = createVercelClient({ token: "tok", projectId: "prj_1", teamId: "team_1" }, fn);
  const d = await vercel.addDomain("client.com");
  assert.equal(d.apexName, "client.com");
  assert.equal(calls[0].url.searchParams.get("teamId"), "team_1");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: "client.com" });
});

test("client.addDomain treats 'already on this project' as success", async () => {
  const { fn } = fakeFetch({
    "POST /v10/projects/prj_1/domains": { status: 400, body: { error: { code: "domain_already_in_use", message: "in use" } } },
    "GET /v9/projects/prj_1/domains/client.com": { body: { name: "client.com", apexName: "client.com", verified: false } },
  });
  const vercel = createVercelClient({ token: "tok", projectId: "prj_1" }, fn);
  const d = await vercel.addDomain("client.com");
  assert.equal(d.verified, false);
});

test("client.addDomain surfaces Vercel's message when the domain belongs elsewhere", async () => {
  const { fn } = fakeFetch({
    "POST /v10/projects/prj_1/domains": { status: 409, body: { error: { code: "domain_already_in_use", message: "Domain is used by another project" } } },
  });
  const vercel = createVercelClient({ token: "tok", projectId: "prj_1" }, fn);
  await assert.rejects(() => vercel.addDomain("client.com"), /another project/);
});

test("client.getDomain returns null on 404 and removeDomain ignores 404", async () => {
  const { fn } = fakeFetch({});
  const vercel = createVercelClient({ token: "tok", projectId: "prj_1" }, fn);
  assert.equal(await vercel.getDomain("gone.com"), null);
  await vercel.removeDomain("gone.com");
});
