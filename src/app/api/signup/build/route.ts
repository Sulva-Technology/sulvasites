import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isTemplateKey } from "@/lib/ai/templateChoice";
import { buildSite } from "@/lib/ai/siteBuilder";
import { sendLifecycleEmail } from "@/lib/billing/email.server";
import { businessKey, isDisposableEmail, normalizeEmail } from "@/lib/billing/identity";
import { canStartSite, evaluateTrialSignup } from "@/lib/billing/signupGuard";
import { collectPriorSignals, hashSignal, recordSignupSignal } from "@/lib/billing/signupSignals.server";
import { DAY_MS } from "@/lib/billing/subscriptionState";
import { listOwnedSites } from "@/lib/billing/subscriptions.server";
import { TRIAL_DAYS } from "@/lib/marketing/pricing";
import { clientIp } from "@/lib/shop/requestIp";
import { shopRateLimit } from "@/lib/shop/rateLimit";
import { briefFromAnswers, parseSignupBody, personalizeSample, type TrialBuild } from "@/lib/signup/fallbackSite";
import { insertTrialSite, persistTrialSite } from "@/lib/signup/persistTrialSite.server";
import { supabaseService } from "@/lib/supabase/admin.server";
import { requireUser } from "@/lib/supabase/requireUser.server";
import { sampleSite } from "@/templates/sampleSite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEVICE_COOKIE = "sv_dev";
const AI_BUDGET_MS = 40_000;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = shopRateLimit(`signup-build:${ip}`, 5, 60 * 60_000);
  if (limited) return limited;

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = parseSignupBody(body, isTemplateKey);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { answers, templateKey, tier, interval } = parsed.value;

  const secret = process.env.SIGNUP_SECRET;
  if (!secret) return json({ error: "Signup is not available right now." }, 503);
  const db = supabaseService();

  let owned;
  try {
    owned = await listOwnedSites(db, auth.userId);
  } catch {
    return json({ error: "Could not check your account. Please try again." }, 500);
  }
  // A retry after a dropped connection returns the site that was just created.
  const recent = owned.find((o) => Date.now() - Date.parse(o.createdAt) < 10 * 60_000 && (o.status === "trialing" || o.status === "paused"));
  if (recent) return json({ siteId: recent.siteId, slug: recent.slug, usedAi: false, warnings: [] });

  const start = canStartSite(owned);
  if (!start.ok) return json({ error: start.error }, 409);

  const jar = await cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value || randomUUID();
  const email = normalizeEmail(auth.email);
  const keys = {
    emailKey: email,
    phoneKey: answers.whatsapp,
    deviceHash: hashSignal(deviceId, secret),
    ipHash: hashSignal(ip, secret),
    businessKey: businessKey(answers.businessName, answers.city),
  };

  let flags: string[] = [];
  if (start.trial) {
    let prior;
    try {
      prior = await collectPriorSignals(db, keys);
    } catch {
      return json({ error: "Signup is not available right now." }, 503);
    }
    const verdict = evaluateTrialSignup({ email, disposable: !!email && isDisposableEmail(email), prior });
    if (!verdict.allow) return json({ error: verdict.error }, verdict.status);
    flags = verdict.flags;
  }

  const created = await insertTrialSite(db, answers.businessName, templateKey);
  if (!created) return json({ error: "Could not create your site. Please try again." }, 500);
  const { siteId, slug } = created;
  const rollback = async () => {
    const { error } = await db.from("sites").delete().eq("id", siteId);
    if (error) console.error("[signup] rollback failed", siteId, error.message);
  };

  const { error: memberErr } = await db.from("site_members").insert({ site_id: siteId, user_id: auth.userId, role: "owner" });
  if (memberErr) {
    await rollback();
    return json({ error: "Could not create your site. Please try again." }, 500);
  }

  const now = Date.now();
  const { error: subErr } = await db.from("site_subscriptions").insert({
    site_id: siteId,
    owner_id: auth.userId,
    tier,
    interval,
    status: start.trial ? "trialing" : "paused",
    trial_ends_at: start.trial ? new Date(now + TRIAL_DAYS * DAY_MS).toISOString() : null,
    paused_at: start.trial ? null : new Date(now).toISOString(),
    flagged: flags.length ? flags.join(",") : null,
  });
  if (subErr) {
    await rollback();
    return json({ error: subErr.code === "23505" ? "You already have a site on a free trial." : "Could not create your site. Please try again." }, subErr.code === "23505" ? 409 : 500);
  }

  // Recorded before the slow AI build so parallel signups with the same email see it and a lost row can't allow a second trial.
  if (start.trial && !(await recordSignupSignal(db, { ...keys, userId: auth.userId, siteId, flags }))) {
    await rollback();
    return json({ error: "Signup is not available right now." }, 503);
  }

  let build: TrialBuild;
  let usedAi = true;
  try {
    const result = await withTimeout(buildSite({ state: briefFromAnswers(answers, auth.email), templateOverride: templateKey }), AI_BUDGET_MS);
    build = { templateKey, profile: result.profile, pages: result.pages, extraPages: result.extraPages };
  } catch (err) {
    usedAi = false;
    console.warn("[signup] AI build failed, using sample content", err instanceof Error ? err.message : "error");
    build = personalizeSample(templateKey, sampleSite(templateKey), answers, auth.email);
  }
  const warnings = await persistTrialSite(db, siteId, build);

  if (start.trial) await sendLifecycleEmail(db, siteId, "welcome");

  const res = json({ siteId, slug, usedAi, warnings });
  res.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
