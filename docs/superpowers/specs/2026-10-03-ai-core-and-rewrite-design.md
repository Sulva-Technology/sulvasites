# AI core + per-section rewrite — design

Date: 2026-10-03. Status: approved in chat.

## Context

AI is used in one place: admin-only "generate whole site from brief"
(`/api/ai/generate-site-groq`, plus a Gemini twin and a provider toggle).
The Groq fetch/JSON/error code lives inline in that route. Goal: make AI a
shared capability and add in-editor tools. Four sub-projects, in order:

1. **AI core + per-section rewrite** (this spec)
2. Auto SEO + image alt text
3. Smarter site generator (template auto-pick, t1–t9 section sets, per-page regen)
4. Visitor chatbot widget (public, needs its own abuse/quota design)

Groq only. Gemini route, toggle, and env var are removed.

## 1. AI core — `src/lib/ai/`

- `groq.server.ts`
  - `groqChat({ system?, user, json?, maxTokens?, temperature?, reasoningEffort? }, deps?)` → `string`.
  - Model: `GROQ_MODEL` (default `openai/gpt-oss-120b`), fallback `GROQ_FALLBACK_MODEL`
    (default `llama-3.3-70b-versatile`).
  - Per model: up to 2 attempts. Retry on 429 / 5xx / network error with backoff
    (500 ms · 2^n, honours `Retry-After`, capped 5 s). After attempts exhausted on 429/5xx/
    model-unavailable, move to fallback model. 401 never retries.
  - `reasoning_effort` only sent for `openai/gpt-oss*` models.
  - Throws `GroqError { code: "not_configured" | "bad_key" | "rate_limited" | "upstream" | "empty", status }`.
  - `deps` = `{ fetch, sleep, env }` injectable so tests need no network.
  - `extractJson(text)` moved here (strips fences, slices first `{` to last `}`).
- `http.server.ts`: `aiErrorResponse(err)` maps `GroqError` → `NextResponse`
  (not_configured 500, bad_key 502, rate_limited 429, upstream 502, empty 422).
- Library files use relative imports only (tests run under Node's runner).
- `generate-site-groq` route refactored onto the core; prompt, validation, image filling unchanged.
  `generate-site` (Gemini) deleted; `AiSiteContentGenerator` loses the provider toggle.

## 2. Per-section rewrite

### API — `POST /api/ai/rewrite`

- `requireAdmin`, `rateLimit("ai-rewrite:" + userId, 30 / 10 min)`.
- Body: `{ section: Section, action: "rewrite"|"shorten"|"expand"|"tone"|"translate", option?: string, context?: string }`.
  - `option`: tone name or target language (required for `tone`/`translate`, ≤ 60 chars).
  - `context`: page title/description for consistency (≤ 1500 chars).
  - `section` JSON ≤ 20 000 chars. `contact_card` rejected (no text).
- Model returns the same section shape as JSON. Server **merges text only**:
  walks the original section; for every string field not in the locked set it takes the AI
  string at the same path/index if present and a string, else keeps the original.
  Locked keys: `type`, `url`, `photoUrl`, `linkedinUrl`, `linkHref`, `ctaHref`, `mapLink`, `showForm`.
  Structure (item counts/order) always comes from the original, so a bad model answer cannot
  break the page or change links/images.
- `richtext.body` is HTML: `<script>`, `<iframe>`, `on*=` attributes and `javascript:` URLs stripped.
- Response `{ section }`. Errors via `aiErrorResponse`.

### Pure helpers — `src/lib/ai/rewrite.ts`

`buildRewritePrompt`, `mergeRewrite(original, aiOutput)`, `sanitizeHtml`, `diffText(a, b)`
(list of `{ path, before, after }` for changed strings, used by the preview).

### UI — `src/components/page-editor/AiRewriteMenu.tsx`

- Dropdown in each section header (both page editors): Rewrite, Shorten, Expand,
  Tone ▸ friendly / formal / bold, Translate ▸ language input.
- Result shown as before/after list with **Apply / Discard**. After Apply, **Undo** is
  offered until the section changes again. Nothing is overwritten silently.
- Existing `onChange(next)` of the section editor is the only write path (draft state;
  saving/publishing unchanged).

## Testing

`tests/aiCore.test.mjs`: retry on 429, fallback model, 401 no retry, missing key, JSON extraction,
reasoning_effort gating. `tests/aiRewrite.test.mjs`: locked fields restored, structure from
original, bad AI output keeps original, HTML sanitised, `diffText`, prompt contains action/option.

## Env

`GROQ_API_KEY` (existing), optional `GROQ_MODEL`, `GROQ_FALLBACK_MODEL`. `GEMINI_API_KEY` no longer used.

## Out of scope

SEO/alt tools, generator upgrades, chatbot, persistent usage quotas (rate limit stays in-memory).
