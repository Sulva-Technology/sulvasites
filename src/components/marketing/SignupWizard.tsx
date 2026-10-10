"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ContentStep, { type LogoPick } from "@/components/marketing/ContentStep";
import type { ColorChoice } from "@/lib/ai/setupPalette";
import { uploadLogo } from "@/lib/assets";
import { normalizePhoneNg } from "@/lib/billing/identity";
import {
  PLAN_INFO, TIERS, TRIAL_DAYS, formatNaira, isInterval, isTier, offeredPlans,
  type Interval, type Tier,
} from "@/lib/marketing/pricing";
import type { SignupAnswers } from "@/lib/signup/fallbackSite";
import { MAX_DETAILS_CHARS } from "@/lib/signup/ownerDetails";
import { suggestTemplates } from "@/lib/signup/suggest";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TEMPLATE_META, templateSupportsShop } from "@/templates/meta";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type Saved = {
  step: Step;
  answers: SignupAnswers;
  templateKey: string;
  tier: Tier;
  interval: Interval;
  /** What the owner pasted from their own AI. */
  detailsText: string;
  /** Colours read from the logo (or tweaked). */
  color: ColorChoice | null;
};

const STORAGE_KEY = "sv-signup";
const LOGO_KEY = "sv-signup-logo";
/** Logos above this are kept in memory only (sessionStorage is ~5 MB). */
const MAX_STORED_LOGO_BYTES = 1_500_000;
const LABELS = ["Your business", "Pick a look", "Your content", "Pick a plan", "Your account", "Building"];
const HEX = /^#[0-9a-f]{6}$/i;
const BUILD_MESSAGES = ["Setting up your site…", "Writing your pages…", "Choosing photos…", "Publishing…"];
const BLANK_ANSWERS: SignupAnswers = { businessName: "", whatTheyDo: "", city: "", whatsapp: "", sellOnline: false };
const input = "w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-koi-ink/10 focus:outline-none focus:ring-2 focus:ring-koi-deep";

type Params = { get(name: string): string | null };

/** Explicit URL params (template, plan, interval) only override fields they validly set. */
function fromParams(params: Params): Partial<Saved> {
  const template = params.get("template");
  const plan = params.get("plan");
  const interval = params.get("interval");
  const out: Partial<Saved> = {};
  if (template && TEMPLATE_META.some((t) => t.key === template)) out.templateKey = template;
  if (isTier(plan)) out.tier = plan;
  if (isInterval(interval)) out.interval = interval;
  return out;
}

function blankState(params: Params): Saved {
  return { step: 1, answers: { ...BLANK_ANSWERS }, templateKey: "", tier: "business", interval: "monthly", detailsText: "", color: null, ...fromParams(params) };
}

/** Read stored progress, validating the shape. A saved build step comes back as the plan step (never auto-rebuild). */
function load(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved> | null;
    if (!v || typeof v !== "object" || !v.answers || typeof v.answers !== "object") return null;
    const a = v.answers as Partial<SignupAnswers>;
    const str = (x: unknown) => (typeof x === "string" ? x : "");
    const step = typeof v.step === "number" && v.step >= 1 && v.step <= 6 ? Math.floor(v.step) : 1;
    const c = v.color as Partial<ColorChoice> | null | undefined;
    return {
      step: (step === 6 ? 4 : step) as Step,
      answers: {
        businessName: str(a.businessName),
        whatTheyDo: str(a.whatTheyDo),
        city: str(a.city),
        whatsapp: str(a.whatsapp),
        sellOnline: a.sellOnline === true,
      },
      templateKey: typeof v.templateKey === "string" && TEMPLATE_META.some((t) => t.key === v.templateKey) ? v.templateKey : "",
      tier: isTier(v.tier) ? v.tier : "business",
      interval: isInterval(v.interval) ? v.interval : "monthly",
      detailsText: str(v.detailsText).slice(0, MAX_DETAILS_CHARS),
      color: c && HEX.test(str(c.accent)) && HEX.test(str(c.accent2)) ? { accent: c.accent!, accent2: c.accent2!, source: c.source === "custom" ? "custom" : "logo" } : null,
    };
  } catch {
    return null;
  }
}

/** Best effort: keep a small logo across reloads (Files can't go in JSON). */
function saveLogo(logo: LogoPick | null) {
  try {
    if (!logo || logo.file.size > MAX_STORED_LOGO_BYTES) return sessionStorage.removeItem(LOGO_KEY);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(LOGO_KEY, JSON.stringify({ name: logo.file.name, type: logo.file.type, data: reader.result }));
      } catch { /* quota: memory only */ }
    };
    reader.readAsDataURL(logo.file);
  } catch { /* private mode */ }
}
async function loadLogo(): Promise<LogoPick | null> {
  try {
    const raw = sessionStorage.getItem(LOGO_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { name?: unknown; type?: unknown; data?: unknown };
    if (typeof v.name !== "string" || typeof v.type !== "string" || typeof v.data !== "string" || !v.data.startsWith("data:image/")) return null;
    const blob = await (await fetch(v.data)).blob();
    const file = new File([blob], v.name, { type: v.type });
    return { file, previewUrl: URL.createObjectURL(file) };
  } catch {
    return null;
  }
}
function save(s: Saved) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode: wizard still works without persistence */
  }
}

export default function SignupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [s, setS] = useState<Saved>(() => blankState(params));
  const paramsRef = useRef(params);
  const [hasSession, setHasSession] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogoState] = useState<LogoPick | null>(null);
  const setLogo = (l: LogoPick | null) => { setLogoState(l); saveLogo(l); };

  // Restore after mount (never during render) so server and client markup match.
  // The state updates run in promise callbacks, not synchronously in the effect body.
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      const saved = load();
      if (saved) setS({ ...saved, ...fromParams(paramsRef.current) });
      setRestored(true);
    });
    void loadLogo().then((l) => { if (live && l) setLogoState(l); });
    void supabaseBrowser().auth.getSession().then(({ data }) => {
      if (live) setHasSession(!!data.session);
    });
    return () => { live = false; };
  }, []);
  // Don't persist the blank defaults before the saved state has been read back.
  useEffect(() => {
    if (restored) save(s);
  }, [s, restored]);

  const set = (patch: Partial<Saved>) => setS((prev) => ({ ...prev, ...patch }));
  const setAnswer = (patch: Partial<SignupAnswers>) => setS((prev) => ({ ...prev, answers: { ...prev.answers, ...patch } }));
  const go = (step: Step) => { setError(null); set({ step }); };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <ol className="flex gap-2 overflow-x-auto text-xs">
        {LABELS.map((l, i) => (
          <li key={l} className={`whitespace-nowrap rounded-full px-3 py-1 ${s.step === i + 1 ? "bg-koi-ink text-white" : s.step > i + 1 ? "bg-koi-deep/10 text-koi-deep" : "bg-white text-koi-ink/50"}`}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>
      <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-koi-ink/5 sm:p-8">
        {error ? <p className="mb-4 rounded-2xl bg-koi-orange/10 px-4 py-3 text-sm text-koi-orange">{error}</p> : null}
        {s.step === 1 ? <BusinessStep s={s} setAnswer={setAnswer} onNext={() => go(2)} setError={setError} /> : null}
        {s.step === 2 ? <LookStep s={s} set={set} onBack={() => go(1)} onNext={() => go(3)} /> : null}
        {s.step === 3 ? (
          <ContentStep
            answers={s.answers}
            templateKey={s.templateKey}
            detailsText={s.detailsText}
            color={s.color}
            logo={logo}
            onDetails={(detailsText) => set({ detailsText })}
            onColor={(color) => set({ color })}
            onLogo={setLogo}
            onBack={() => go(2)}
            onNext={() => go(4)}
          />
        ) : null}
        {s.step === 4 ? <PlanStep s={s} set={set} onBack={() => go(3)} onNext={() => go(hasSession ? 6 : 5)} /> : null}
        {s.step === 5 ? <AccountStep onBack={() => go(4)} onDone={() => { setHasSession(true); go(6); }} setError={setError} /> : null}
        {s.step === 6 ? (
          <BuildStep
            s={s}
            logo={logo}
            onError={setError}
            onDone={(siteId) => {
              try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(LOGO_KEY); } catch { /* ignore */ }
              router.push(`/dashboard/${siteId}?welcome=1`);
            }}
          />
        ) : null}
      </div>
      <p className="mt-4 text-center text-xs text-koi-ink/50">
        Already have an account? <Link href="/login" className="text-koi-deep">Sign in</Link>
      </p>
    </div>
  );
}

function Nav({ onBack, next, disabled }: { onBack?: () => void; next: string; disabled?: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {onBack ? <button type="button" onClick={onBack} className="text-sm text-koi-ink/60">← Back</button> : <span />}
      <button type="submit" disabled={disabled} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white disabled:opacity-50">{next}</button>
    </div>
  );
}

function BusinessStep({ s, setAnswer, onNext, setError }: {
  s: Saved; setAnswer: (p: Partial<SignupAnswers>) => void; onNext: () => void; setError: (e: string | null) => void;
}) {
  const a = s.answers;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!normalizePhoneNg(a.whatsapp)) return setError("Enter a Nigerian WhatsApp number, e.g. 0803 123 4567.");
        onNext();
      }}
    >
      <h1 className="text-2xl font-semibold">Tell us about your business</h1>
      <div className="mt-6 grid gap-4">
        <input required minLength={2} maxLength={80} placeholder="Business name" value={a.businessName} onChange={(e) => setAnswer({ businessName: e.target.value })} className={input} />
        <input required minLength={3} maxLength={160} placeholder="What do you do? e.g. Custom cakes for weddings" value={a.whatTheyDo} onChange={(e) => setAnswer({ whatTheyDo: e.target.value })} className={input} />
        <div className="grid gap-4 sm:grid-cols-2">
          <input required minLength={2} maxLength={60} placeholder="City" value={a.city} onChange={(e) => setAnswer({ city: e.target.value })} className={input} />
          <input required placeholder="WhatsApp number" inputMode="tel" value={a.whatsapp} onChange={(e) => setAnswer({ whatsapp: e.target.value })} className={input} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={a.sellOnline} onChange={(e) => setAnswer({ sellOnline: e.target.checked })} className="size-4 accent-koi-deep" />
          I want to sell products or take food orders online
        </label>
      </div>
      <Nav next="Next" />
    </form>
  );
}

function LookStep({ s, set, onBack, onNext }: { s: Saved; set: (p: Partial<Saved>) => void; onBack: () => void; onNext: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const suggested = useMemo(() => suggestTemplates(s.answers), [s.answers]);
  const keys = showAll ? TEMPLATE_META.map((t) => t.key) : [...new Set([...(s.templateKey ? [s.templateKey] : []), ...suggested])];
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (s.templateKey) onNext(); }}>
      <h1 className="text-2xl font-semibold">Pick a look</h1>
      <p className="mt-1 text-sm text-koi-ink/60">{showAll ? "All designs." : "Our picks for your business."} You can change words, photos and colours later.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {keys.map((k) => {
          const t = TEMPLATE_META.find((m) => m.key === k)!;
          const on = s.templateKey === k;
          return (
            <button key={k} type="button" onClick={() => set({ templateKey: k })} className={`rounded-2xl p-2 text-left ring-2 ${on ? "ring-koi-deep" : "ring-transparent hover:ring-koi-ink/10"}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-koi-paper">
                <iframe src={`/templates/${k}?thumb=1`} title={`${t.name} preview`} loading="lazy" tabIndex={-1} aria-hidden className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0" />
              </div>
              <p className="mt-2 text-sm font-medium">{t.name}</p>
              <p className="text-xs text-koi-ink/60">{t.category}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-koi-deep">{showAll ? "Show our picks" : `See all ${TEMPLATE_META.length}`}</button>
        {s.templateKey ? <a href={`/templates/${s.templateKey}`} target="_blank" rel="noopener" className="text-koi-deep">Preview full site ↗</a> : null}
      </div>
      <Nav onBack={onBack} next="Next" disabled={!s.templateKey} />
    </form>
  );
}

function PlanStep({ s, set, onBack, onNext }: { s: Saved; set: (p: Partial<Saved>) => void; onBack: () => void; onNext: () => void }) {
  const plans = offeredPlans();
  const wantsShop = s.answers.sellOnline || templateSupportsShop(s.templateKey);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <h1 className="text-2xl font-semibold">Pick a plan</h1>
      <p className="mt-1 text-sm text-koi-ink/60">₦0 today · {TRIAL_DAYS} days free · no card</p>
      <div className="mt-4 inline-flex rounded-full bg-koi-paper p-1 ring-1 ring-koi-ink/10">
        {(["monthly", "annually"] as const).map((i) => (
          <button key={i} type="button" onClick={() => set({ interval: i })} className={`rounded-full px-4 py-2 text-sm ${s.interval === i ? "bg-koi-ink text-white" : "text-koi-ink/70"}`}>
            {i === "monthly" ? "Monthly" : "Yearly · 2 months free"}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {TIERS.map((tier) => {
          const p = plans.find((x) => x.tier === tier && x.interval === s.interval)!;
          const on = s.tier === tier;
          return (
            <button key={tier} type="button" onClick={() => set({ tier })} className={`flex items-center justify-between gap-4 rounded-2xl p-4 text-left ring-2 ${on ? "ring-koi-deep" : "ring-koi-ink/10"}`}>
              <span>
                <span className="font-medium">{PLAN_INFO[tier].name}</span>
                <span className="block text-sm text-koi-ink/60">{PLAN_INFO[tier].blurb}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-semibold">{formatNaira(p.price)}</span>
                <span className="text-sm text-koi-ink/60">{s.interval === "monthly" ? "/mo" : "/yr"}</span>
                {p.launch ? <span className="block text-xs text-koi-ink/40 line-through">{formatNaira(p.standardPrice)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {wantsShop && s.tier !== "commerce" ? (
        <p className="mt-4 rounded-2xl bg-koi-deep/5 p-4 text-sm">
          Selling online needs the Commerce plan.{" "}
          <button type="button" onClick={() => set({ tier: "commerce" })} className="font-medium text-koi-deep">Switch to Commerce</button>
        </p>
      ) : null}
      <p className="mt-4 text-xs text-koi-ink/50">You won&apos;t be charged now. Pick a card before day {TRIAL_DAYS} to keep your site live.</p>
      <Nav onBack={onBack} next="Next" />
    </form>
  );
}

function AccountStep({ onBack, onDone, setError }: { onBack: () => void; onDone: () => void; setError: (e: string | null) => void }) {
  const [phase, setPhase] = useState<"form" | "code">("form");
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const supabase = supabaseBrowser();

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return setError("This email already has an account. Sign in, then come back to add a site.");
    }
    if (data.session) return onDone();
    setPhase("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
    setBusy(false);
    if (error || !data.session) return setError(error?.message ?? "That code didn't work. Check the latest email and try again.");
    onDone();
  }

  async function resend() {
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setError(error ? error.message : "We sent a new code.");
  }

  if (phase === "code") {
    return (
      <form onSubmit={verify}>
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-1 text-sm text-koi-ink/60">We sent a code to {email}.</p>
        {/* Code length follows the Supabase "Email OTP Length" setting (6–10 digits). */}
        <input required inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} className={`${input} mt-6 text-center text-2xl tracking-[0.3em]`} />
        <button type="button" onClick={resend} className="mt-3 text-sm text-koi-deep">Send a new code</button>
        <Nav onBack={() => setPhase("form")} next={busy ? "Checking…" : "Verify and build my site"} disabled={busy || code.length < 6} />
      </form>
    );
  }
  return (
    <form onSubmit={signUp}>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <div className="mt-6 grid gap-4">
        <input required placeholder="Your full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        <input required type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input required type="password" minLength={8} placeholder="Password (8+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </div>
      <Nav onBack={onBack} next={busy ? "Creating…" : "Create account"} disabled={busy} />
    </form>
  );
}

function BuildStep({ s, logo, onDone, onError }: { s: Saved; logo: LogoPick | null; onDone: (siteId: string) => void; onError: (msg: string | null) => void }) {
  const [msg, setMsg] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsg((m) => Math.min(m + 1, BUILD_MESSAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [attempt]);

  // StrictMode mounts effects twice in dev: send one request per attempt, and apply its result
  // unless the component has really unmounted.
  const mounted = useRef(false);
  const startedAttempt = useRef(-1);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (startedAttempt.current === attempt) return;
    startedAttempt.current = attempt;
    (async () => {
      try {
        const { data } = await supabaseBrowser().auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/signup/build", {
          method: "POST",
          headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ answers: s.answers, templateKey: s.templateKey, tier: s.tier, interval: s.interval, details: s.detailsText, color: s.color }),
        });
        const body = (await res.json().catch(() => ({}))) as { siteId?: string; error?: string };
        if (!mounted.current) return;
        if (res.ok && body.siteId) {
          // The site exists now, so the owner may upload to it. A failed logo never blocks the welcome.
          if (logo) await uploadLogo(body.siteId, logo.file).catch(() => undefined);
          if (!mounted.current) return;
          return onDone(body.siteId);
        }
        setFailed(true);
        onError(body.error ?? "Something went wrong while building your site.");
      } catch {
        if (!mounted.current) return;
        setFailed(true);
        onError("We couldn't reach the server. Check your connection and try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <div className="py-10 text-center">
      {failed ? (
        <button type="button" onClick={() => { setMsg(0); setFailed(false); onError(null); setAttempt((n) => n + 1); }} className="rounded-full bg-koi-deep px-6 py-3 font-medium text-white">Try again</button>
      ) : (
        <>
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-koi-deep/20 border-t-koi-deep" />
          <p className="mt-6 text-lg font-medium">{BUILD_MESSAGES[msg]}</p>
          <p className="mt-1 text-sm text-koi-ink/60">This takes up to a minute.</p>
        </>
      )}
    </div>
  );
}
