"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ColorStep } from "@/components/admin/assistant/ColorStep";
import { LogoStep } from "@/components/admin/assistant/LogoStep";
import { PhotoStep, stockPhoto, type PhotoChoice } from "@/components/admin/assistant/PhotoStep";
import { Swatches } from "@/components/admin/assistant/stepUi";
import {
  runStagedBuild,
  sendChat,
  type BuildProgress,
  type BuildResult,
  type Brief,
  type ChatMessage,
  type SitePlan,
} from "@/lib/ai/assistantClient";
import { createSiteFromBuild } from "@/lib/ai/createSite";
import { colorWordsToChoice, expandPalette, type ColorChoice } from "@/lib/ai/setupPalette";
import { emptySetup, uploadIndex, type SiteSetup } from "@/lib/ai/setupPhotos";
import { slugify } from "@/lib/slugify";
import { categoryForTemplate, photoUrl } from "@/lib/stockPhotos";
import { TEMPLATE_META, templateLabel } from "@/templates/meta";

const GREETING =
  "Hi, I am the Sulva assistant. Tell me about the business you want a website for: its name, what it does and where it is. One message is enough. Then you can add your logo, colours and photos, and I will build the site.";

const STARTERS = ["A restaurant or cafe", "A beauty salon", "A clinic", "An online shop"];

type Step = "logo" | "color" | "photos";
type Phase = "chat" | Step | "review";
const STEPS: Step[] = ["logo", "color", "photos"];

/** ui: shown in the log but never sent to the model. receipt: a live summary of a setup step. */
type View = { role: "user" | "assistant"; content: string; ui?: boolean; receipt?: Step };

const AFTER_STEP: Record<Step, { done: string; skipped: string }> = {
  logo: { done: "Nice logo. Now pick your colours.", skipped: "No problem. Let's pick your colours." },
  color: { done: "Great colours. Last step: photos.", skipped: "I will choose colours that suit the template. Last step: photos." },
  photos: { done: 'All set. Tap "Build my site" when you are ready.', skipped: 'I will pick matching photos. Tap "Build my site" when you are ready.' },
};

const STEP_NAME: Record<Step, string> = { logo: "your logo", color: "colours", photos: "photos" };

const SOURCE_LABEL: Record<ColorChoice["source"], string> = {
  logo: "From your logo",
  words: "Your colours",
  preset: "Suggested palette",
  custom: "Custom colours",
};

/** Owner said "our colours are navy and gold" but the model left brief.colors empty. */
function colorsFromTranscript(list: View[]): string {
  const text = list.filter((m) => m.role === "user" && !m.ui).map((m) => m.content).join("\n");
  return text.match(/colou?rs?\s+(?:are|is)\s+([a-z ,&]+)/i)?.[1]?.trim() ?? "";
}

function smallImage(url: string) {
  return url.startsWith("https://images.unsplash.com/") ? url.replace(/([?&])w=\d+/, "$1w=300") : url;
}

export default function SiteAssistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<View[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [phase, setPhase] = useState<Phase>("chat");
  const [doneSteps, setDoneSteps] = useState<Step[]>([]);
  const [setup, setSetup] = useState<SiteSetup>(emptySetup);
  const [logoColors, setLogoColors] = useState<ColorChoice | null>(null);
  const [suggested, setSuggested] = useState<{ templateKey: string; reason: string } | null>(null);
  const [chips, setChips] = useState<string[]>(STARTERS);
  const [thinking, setThinking] = useState(false);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [doneStages, setDoneStages] = useState<Array<{ stage: string; label: string }>>([]);
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const setupRef = useRef(setup);

  const building = progress !== null;
  const busy = thinking || building || creating;
  const ready = phase !== "chat";
  const inSetup = phase === "logo" || phase === "color" || phase === "photos";

  const previewTemplate = templateKey || suggested?.templateKey || "t1";
  const category = result?.photoCategory ?? categoryForTemplate(suggested?.templateKey);
  const fromWords = useMemo(
    () => colorWordsToChoice(brief?.colors || colorsFromTranscript(messages)),
    [brief?.colors, messages],
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, progress, result, phase]);

  // Object URLs live as long as the assistant; free them when it unmounts.
  useEffect(() => {
    setupRef.current = setup;
  }, [setup]);
  useEffect(
    () => () => {
      const s = setupRef.current;
      if (s.logo) URL.revokeObjectURL(s.logo.previewUrl);
      for (const u of s.uploads) URL.revokeObjectURL(u.previewUrl);
    },
    [],
  );

  // Files cannot be saved anywhere before the site exists: warn before leaving.
  const hasUnsavedFiles = !created && (!!setup.logo || setup.uploads.length > 0);
  useEffect(() => {
    if (!hasUnsavedFiles) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedFiles]);

  const transcript = (list: View[]): ChatMessage[] =>
    list.filter((m) => !m.ui).map((m) => ({ role: m.role, content: m.content }));

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    setChips([]);
    const next: View[] = [...messages, { role: "user", content }];
    setMessages(next);
    setThinking(true);
    try {
      // The greeting is UI-only; the model only sees the real conversation.
      const turn = await sendChat(transcript(next.slice(1)), brief);
      setBrief(turn.state);
      setChips(turn.quickReplies);
      if (turn.suggestedTemplate) setSuggested(turn.suggestedTemplate);
      if (turn.state.businessName && !slug) setSlug(slugify(turn.state.businessName));
      setMessages([...next, { role: "assistant", content: turn.reply }]);
      if (turn.ready && phase === "chat") setPhase("logo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setChips([]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  function finishStep(step: Step, skipped: boolean) {
    const done = doneSteps.includes(step) ? doneSteps : [...doneSteps, step];
    setDoneSteps(done);
    setSetup((s) => {
      const next = { ...s, skipped: { ...s.skipped, [step]: skipped } };
      if (skipped && step === "color") next.color = null;
      if (skipped && step === "logo" && s.logo) {
        URL.revokeObjectURL(s.logo.previewUrl);
        next.logo = null;
      }
      return next;
    });
    if (skipped && step === "logo") setLogoColors(null);
    const after = STEPS.find((x) => !done.includes(x));
    const inOrder = STEPS[STEPS.indexOf(step) + 1];
    const line = result
      ? "Saved. It is applied when you create the site."
      : after === inOrder
        ? AFTER_STEP[step][skipped ? "skipped" : "done"]
        : after
          ? `Saved. Next: ${STEP_NAME[after]}.`
          : 'Saved. Tap "Build my site" when you are ready.';
    setMessages((m) => [
      ...m,
      { role: "user", content: "", ui: true, receipt: step },
      { role: "assistant", content: line, ui: true },
    ]);
    setPhase(after ?? "review");
  }

  function enterStep(step: Step) {
    if (busy) return;
    setPhase(step);
  }

  // Preselect the most likely palette when the colour step opens for the first time.
  useEffect(() => {
    if (phase !== "color") return;
    setSetup((s) => (s.color ? s : { ...s, color: logoColors ?? fromWords ?? null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the step opens
  }, [phase]);

  async function build(override?: string) {
    if (building) return;
    setError(null);
    setResult(null);
    setDoneStages([]);
    setProgress({ stage: "start", label: "Starting…", step: 0, total: 1 });
    try {
      const out = await runStagedBuild(
        {
          messages: transcript(messages.slice(1)),
          state: brief,
          templateOverride: override,
          plan: override && plan ? plan : undefined,
          images: {
            uploadSlots: setup.uploads.length,
            preferred: setup.stockIds.map((id) => ({ url: photoUrl(id), alt: stockPhoto(id)?.alt ?? brief?.businessName ?? "Photo" })),
          },
        },
        (p) => {
          setProgress(p);
          setDoneStages((d) => (d.some((x) => x.stage === p.stage) ? d : [...d, { stage: p.stage, label: p.label }]));
        },
      );
      setPlan(out.plan);
      setResult(out.result);
      setTemplateKey(out.result.templateKey);
      setSlug((s) => s || out.result.slugSuggestion);
      setPhase("review");
      setMessages((m) => [...m, { role: "assistant", content: "Your site is written. Check the template below, then create it.", ui: true }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The build failed. Try again.");
    } finally {
      setProgress(null);
    }
  }

  async function create() {
    if (!result || creating) return;
    setCreating(true);
    setError(null);
    try {
      const out = await createSiteFromBuild(result, slug || result.slugSuggestion, setup);
      if (out.warnings.length) console.warn("Site created with warnings:", out.warnings);
      setCreated(true);
      router.replace(`/admin/sites/${out.siteId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the site.");
      setCreating(false);
    }
  }

  const templateChanged = !!result && templateKey !== result.templateKey;
  const hero = result?.pages.home.sections.find((s) => s.type === "hero");
  const homeGallery = result?.pages.home.sections.find((s) => s.type === "gallery");
  const strip =
    homeGallery && homeGallery.type === "gallery"
      ? homeGallery.images
          .map((im) => {
            const n = uploadIndex(im.url);
            if (n >= 0) return setup.uploads[n] ? { url: setup.uploads[n]!.previewUrl, alt: setup.uploads[n]!.alt, own: true } : null;
            return im.url ? { url: smallImage(im.url), alt: im.alt, own: false } : null;
          })
          .filter((x): x is { url: string; alt: string; own: boolean } => !!x)
          .slice(0, 8)
      : [];
  const palette = setup.color ? expandPalette(templateKey || result?.templateKey || previewTemplate, setup.color) : null;

  function renderReceipt(step: Step) {
    const canChange = !busy && !created && (step !== "photos" || !result);
    let body: React.ReactNode;
    if (step === "logo") {
      body = setup.logo ? (
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.logo.previewUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />
          Logo added
        </span>
      ) : (
        "No logo for now"
      );
    } else if (step === "color") {
      body = setup.color ? (
        <span className="flex items-center gap-2">
          <Swatches colors={[setup.color.accent, setup.color.accent2]} />
          {SOURCE_LABEL[setup.color.source]}
        </span>
      ) : (
        "Choose colours for me"
      );
    } else {
      const n = setup.uploads.length;
      const k = setup.stockIds.length;
      body =
        n || k ? (
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {[...setup.uploads.map((u) => u.previewUrl), ...setup.stockIds.map((id) => photoUrl(id, 120))].slice(0, 4).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-koi-ink" />
              ))}
            </span>
            {[n ? `${n} photo${n === 1 ? "" : "s"}` : "", k ? `${k} demo pick${k === 1 ? "" : "s"}` : ""].filter(Boolean).join(" + ")}
          </span>
        ) : (
          "Choose photos for me"
        );
    }
    return (
      <div className="flex items-center gap-3">
        {body}
        {canChange ? (
          <button type="button" onClick={() => enterStep(step)} className="text-xs text-white/80 underline underline-offset-2 hover:text-white">
            Change
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div data-tour="assistant-chat" className="flex flex-col rounded-3xl bg-white p-0 shadow-[0_1px_0_rgba(10,15,31,.04),0_12px_40px_-20px_rgba(10,63,196,.25)] ring-1 ring-koi-ink/5">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the site assistant"
        className="max-h-[70vh] min-h-[16rem] space-y-3 overflow-y-auto p-4"
      >
        {messages.map((m, i) => {
          // A receipt for a step that was later redone: only the newest one stays live.
          if (m.receipt && messages.slice(i + 1).some((x) => x.receipt === m.receipt)) return null;
          return (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-2.5 text-sm " +
                  (m.role === "user" ? "rounded-br-md bg-koi-ink text-white" : "rounded-bl-md bg-koi-paper text-koi-ink")
                }
              >
                <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
                {m.receipt ? renderReceipt(m.receipt) : m.content}
              </div>
            </div>
          );
        })}

        {thinking ? (
          <div className="flex justify-start" role="status">
            <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-koi-paper px-4 py-3">
              <span className="sr-only">The assistant is typing</span>
              {[0, 150, 300].map((d) => (
                <span key={d} aria-hidden className="h-2 w-2 animate-bounce rounded-full bg-koi-sea/60 motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : null}

        {phase === "logo" && !building ? (
          <LogoStep
            value={setup.logo}
            onChange={(logo) => setSetup((s) => ({ ...s, logo }))}
            onColors={(c) => {
              setLogoColors(c);
              // A colour already taken from an old logo follows the new one.
              setSetup((s) => (s.color?.source === "logo" ? { ...s, color: c } : s));
            }}
            onDone={() => finishStep("logo", false)}
            onSkip={() => finishStep("logo", true)}
            disabled={busy}
          />
        ) : null}
        {phase === "color" && !building ? (
          <ColorStep
            value={setup.color}
            onChange={(color) => setSetup((s) => ({ ...s, color }))}
            onDone={() => finishStep("color", false)}
            onSkip={() => finishStep("color", true)}
            category={category}
            templateKey={previewTemplate}
            fromLogo={logoColors}
            fromWords={fromWords}
            disabled={busy}
          />
        ) : null}
        {phase === "photos" && !building ? (
          <PhotoStep
            value={{ uploads: setup.uploads, stockIds: setup.stockIds }}
            onChange={(v: PhotoChoice) => setSetup((s) => ({ ...s, uploads: v.uploads, stockIds: v.stockIds }))}
            onDone={() => finishStep("photos", false)}
            onSkip={() => {
              setSetup((s) => {
                for (const u of s.uploads) URL.revokeObjectURL(u.previewUrl);
                return { ...s, uploads: [], stockIds: [] };
              });
              finishStep("photos", true);
            }}
            category={category}
            seed={brief?.businessName || "site"}
            disabled={busy}
          />
        ) : null}

        {building ? (
          <div className="rounded-3xl bg-koi-paper p-4 text-sm" role="status">
            <p className="font-medium text-koi-ink">
              {progress?.label}{" "}
              <span className="font-normal text-koi-ink/55">
                (step {Math.min(progress?.step ?? 0, progress?.total ?? 1)} of {progress?.total})
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-koi-ink/10" aria-hidden>
              <div className="h-full bg-koi-sea transition-all" style={{ width: `${Math.round(((progress?.step ?? 0) / (progress?.total || 1)) * 100)}%` }} />
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-koi-ink/60">
              {doneStages
                .filter((x) => x.stage !== progress?.stage)
                .map((x) => (
                  <li key={x.stage}>Done: {x.label.replace(/…$/, "")}</li>
                ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <section aria-label="Build result" className="rounded-3xl p-4 ring-1 ring-koi-ink/10 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-koi-ink/55">Chosen template</p>
            <p className="mt-1 text-base font-semibold text-koi-ink">{templateLabel(result.templateKey)}</p>
            <p className="mt-1 text-sm text-koi-ink/75">{result.reason}</p>

            <label className="mt-3 block">
              <span className="text-sm font-medium text-koi-ink/80">Use a different template</span>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
              >
                {TEMPLATE_META.map((t) => (
                  <option key={t.key} value={t.key}>
                    {templateLabel(t.key)}
                  </option>
                ))}
              </select>
            </label>
            {templateChanged ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => build(templateKey)}
                  disabled={busy}
                  className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
                >
                  Rewrite for {TEMPLATE_META.find((t) => t.key === templateKey)?.name}
                </button>
                <span className="text-xs text-koi-ink/60">Pages are written per template, so rewrite before creating.</span>
              </div>
            ) : null}

            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-koi-ink/55">Business</dt>
                <dd className="text-koi-ink">{result.profile.business_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-koi-ink/55">Tagline</dt>
                <dd className="text-koi-ink">{result.profile.tagline ?? "None"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-koi-ink/55">Home headline</dt>
                <dd className="text-koi-ink">{hero && hero.type === "hero" ? hero.headline : "None"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-koi-ink/55">Brand</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-3 text-koi-ink" data-testid="brand-row">
                  {setup.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={setup.logo.previewUrl} alt="Your logo" className="h-10 w-10 rounded-xl bg-white object-contain ring-1 ring-koi-ink/10" />
                  ) : (
                    <span className="text-koi-ink/60">No logo</span>
                  )}
                  {palette ? (
                    <span className="flex items-center gap-2">
                      <span className="flex gap-1" aria-label="Site colours">
                        {(["accent", "accent2", "bg", "surface"] as const).map((k) => (
                          <span key={k} title={`${k}: ${palette[k]}`} data-color={palette[k]} className="h-6 w-6 rounded-full ring-1 ring-koi-ink/15" style={{ background: palette[k] }} />
                        ))}
                      </span>
                      <span className="text-xs text-koi-ink/60">{SOURCE_LABEL[setup.color!.source]}</span>
                    </span>
                  ) : (
                    <span className="text-koi-ink/60">Template colours</span>
                  )}
                  {!created ? (
                    <span className="flex gap-2 text-xs">
                      <button type="button" disabled={busy} onClick={() => enterStep("logo")} className="text-koi-ink/75 underline underline-offset-2">
                        Change logo
                      </button>
                      <button type="button" disabled={busy} onClick={() => enterStep("color")} className="text-koi-ink/75 underline underline-offset-2">
                        Change colours
                      </button>
                    </span>
                  ) : null}
                </dd>
              </div>
              {strip.length ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-koi-ink/55">Home gallery</dt>
                  <dd className="mt-1 flex gap-2 overflow-x-auto pb-1" data-testid="photo-strip">
                    {strip.map((im, i) => (
                      <span key={`${im.url}-${i}`} className={"relative h-16 w-20 shrink-0 overflow-hidden rounded-xl " + (im.own ? "ring-2 ring-koi-ink" : "ring-1 ring-koi-ink/10")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={im.url} alt={im.alt} className="h-full w-full object-cover" />
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-xs text-koi-ink/55">Pages (saved as drafts)</dt>
                <dd className="text-koi-ink">Home, About, Contact{result.extraPages.map((p) => `, ${p.label}`).join("")}</dd>
              </div>
            </dl>

            {result.notes.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-koi-ink/60">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}

            <label className="mt-4 block">
              <span className="text-sm font-medium text-koi-ink/80">Site address</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={creating}
                className="mt-1 w-full rounded-2xl border border-koi-ink/10 bg-white px-4 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
              />
              <span className="mt-1 block text-xs text-koi-ink/60">
                Preview URL: <span className="font-mono">https://{slugify(slug) || "your-slug"}.soothecontrols.site</span>. A number is added if it is taken.
              </span>
            </label>

            <button
              type="button"
              onClick={create}
              disabled={busy || templateChanged || inSetup || !slugify(slug)}
              className="mt-4 w-full rounded-full bg-koi-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60 sm:w-auto"
            >
              {creating ? "Creating…" : "Create site"}
            </button>
          </section>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="border-t border-koi-ink/5 p-3 sm:p-4">
        {!result && phase === "review" && !building ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => build()}
              disabled={busy}
              className="rounded-full bg-koi-ink px-5 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
            >
              Build my site
            </button>
            <span className="text-xs text-koi-ink/60">Or add more details below first.</span>
          </div>
        ) : null}

        {chips.length > 0 && !busy ? (
          <div className="mb-2 flex flex-wrap gap-2" aria-label="Quick replies">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => (/^skip/i.test(c) && ready ? (phase === "review" ? build() : undefined) : send(c))}
                className="rounded-full bg-white px-3.5 py-1.5 text-sm text-koi-ink ring-1 ring-koi-ink/10 hover:bg-koi-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">Your message</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              maxLength={8000}
              placeholder={inSetup ? "Anything else about the business? (optional)" : "e.g. Kings Bakery in Lagos. We bake bread and custom cakes. Call 0803…"}
              className="w-full resize-none rounded-[1.5rem] border border-koi-ink/10 bg-white px-5 py-2.5 text-sm text-koi-ink outline-none transition focus:border-koi-sea focus:ring-4 focus:ring-koi-sea/15"
              disabled={creating || building}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-koi-ink text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi-orange disabled:opacity-60"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
