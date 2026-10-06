# Sulva Sites

Sulvatech's internal multi-tenant website builder for small businesses. Admins create a site, pick a template,
fill content (by hand or with AI), and publish it to `<slug>.soothecontrols.site` or a custom domain.

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres, Auth, Storage) · Tailwind 4 · Vercel

## Setup

1. `npm install`
2. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...        # server only, never NEXT_PUBLIC_
   NEXT_PUBLIC_PLATFORM_DOMAIN=soothecontrols.site
   # AI for every feature (site builder, setup chat, rewrite, SEO, "Ask AI"). All free tiers; set any of them.
   # They are tried in order — Gemini, then OpenRouter, then Groq — and the next answers when one is out of quota or down.
   GEMINI_API_KEY=...                   # first choice: free key from aistudio.google.com. Also checks product photos
   # GEMINI_MODEL=gemini-3.8-flash        # default (free tier). Free-tier prompts may be used by Google to improve its products
   # GEMINI_TIMEOUT_MS=20000              # per-call limit before moving on to OpenRouter
   OPENROUTER_API_KEY=...               # second choice. A one-off $10 credit purchase lifts free models from 50 to 1,000 requests/day
   # OPENROUTER_MODEL=thinkingmachines/inkling:free   # default; free endpoint (may be logged, daily caps). Drop ":free" for the paid, no-data-retention endpoint
   # OPENROUTER_FALLBACK_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free   # default; OpenRouter tries it when the main model errors ("off" to disable)
   # OPENROUTER_TIMEOUT_MS=25000          # time budget shared by Gemini and OpenRouter before falling back to Groq
   # AI_PROVIDERS=openrouter,gemini       # change which of the two goes first
   GROQ_API_KEY=...                     # optional last resort when the others fail or are slow
   # GROQ_MODEL=... GROQ_FALLBACK_MODEL=...   # optional Groq model overrides
   # AI_ASSISTANT_MONTHLY_LIMIT=50        # "Ask AI" requests per site per month for owners (admins unmetered)
   # Product photos in "Ask AI" (add products by chat). A vision model (Gemini, else OpenRouter's) checks the photos:
   UNSPLASH_ACCESS_KEY=...              # recommended: free "Access Key" from unsplash.com/developers (demo mode: 50 searches/hour)
   # PEXELS_API_KEY=...                 # optional, used first when set (Pexels has paused new keys)
   # OPENROUTER_VISION_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free   # default (free); used when Gemini is not set or fails
   # AI_VISION=off                      # turn the vision step off (photo search then keeps the provider's order)
   ```

3. In the Supabase SQL editor run, in order:
   - `supabase/schema.sql`
   - `supabase/migrations/*.sql` (numbered order) up to `011`
   - `supabase/admin/add_current_user_as_admin.sql` (after creating your user)
   - Locked out of `/admin` or a site later? Run `supabase/admin/restore_admin_access.sql` with your email
   - `supabase/migrations/012_admin_site_ownership.sql` (put your email on its `SUPER ADMIN EMAIL` line first)
   - `supabase/migrations/013_ai_usage.sql` ("Ask AI" monthly allowance; without it requests are not metered)
   - `supabase/migrations/014_super_admin_only_guard.sql` (only super admins can add, change or remove admins)
   - `supabase/migrations/015_whatsapp_orders.sql` (orders sent on WhatsApp show under Orders; owners mark them completed)
   - `supabase/fixes/fix_storage_rls.sql` (bucket `site-assets`)
4. `npm run dev` → http://localhost:3000/login, sites at http://localhost:3000/<slug>

> ⚠️ `supabase/dev-only/` scripts disable RLS. Never run them on production — see its README.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Node built-in runner, `tests/`) |
| `npm run eval:assistant` | Runs the 20 real-style "Ask AI" requests in `tests/eval/` against the live models (`GEMINI_API_KEY`, `OPENROUTER_API_KEY` and/or `GROQ_API_KEY`; one model call each). `-- --gemini`, `-- --openrouter` or `-- --groq` scores one provider alone, to compare them. Run it before launch and after any model change; it fails below 85%. |

## How routing works

`middleware.ts` → `src/lib/hostRouting.ts` rewrites by host:

| Request | Rewritten to |
| --- | --- |
| `bakery.soothecontrols.site/about` | `/bakery/about` |
| `client.com/about` | `/d/client.com/about` |
| `localhost`, `*.vercel.app`, `/admin`, `/api` | unchanged |

Both route families (`src/app/[slug]/…` and `src/app/d/[hostname]/…`) are thin wrappers around
`src/lib/publicSite.server.ts` (lookup, metadata, JSON-LD) and `src/components/site/PublicSitePage.tsx`.

## Templates

`src/templates/templateN/` — each template is intentionally self-contained so its design can be unique.
All share the props in `src/templates/registry.ts`; names/categories for the admin UI are in `src/templates/meta.ts`.

| Key | Name | Category | Look |
| --- | --- | --- | --- |
| t1 | Meridian | Corporate | IBM Plex, white + navy + emerald, ruled grids |
| t2 | Journal | Editorial | DM Serif Display + Archivo, black/white/red, newspaper masthead |
| t3 | Atelier | Portfolio | Instrument Serif + Manrope, warm paper, terracotta |
| t4 | Launch | Product / app | Space Grotesk, orange + near-black, bento + device mockups |
| t5 | Maison | Beauty & booking | Bodoni Moda + Jost, porcelain + aubergine + rose, arches |
| t6 | Estate | Real estate | Sora + DM Sans, limestone + midnight + cobalt, property search |

Each template follows the same structure: `TemplateN.tsx` (shell + scroll-reveal), `components/`
(header, footer), `sections/` (one file per section type + `TNSections.tsx` renderer), `templateN.css`
(all styles scoped under `.templateN`). Shared, design-agnostic helpers live in `src/templates/shared/`
(`edit.ts` inline-editing helpers, `links.ts` tel/mail/WhatsApp links, `theme.ts` legacy-colour guard).

**Colours:** every template exposes six CSS variables — `--tN-accent`, `--tN-accent2`, `--tN-ink`,
`--tN-muted`, `--tN-bg`, `--tN-surface` — and derives lines/tints with `color-mix()`. The palette editor
config is `src/lib/templateTheme.ts` (a test checks it matches each CSS file); logo colours map in
`src/lib/themeVars.ts`.

**Adding a template:** create `src/templates/templateN/TemplateN.tsx` accepting `TemplateProps`,
then add one line to `TEMPLATES` in `registry.ts`. Public routes and admin preview pick it up automatically.

**Pages per template:** besides Home / About / Contact, each template ships recommended pages
(e.g. Portfolio → Work, Services) defined in `src/templates/pagePresets.ts`. New sites get them as
drafts; existing sites can add them from the site's *Extra pages* panel. Published extra pages
(`/p/<key>`) appear in the header and footer nav automatically (`navPages` prop).

**Previewing without a database (dev only):** `npm run dev`, then open
`http://localhost:3000/dev/templates/t3` (or `/t3/about`, `/t3/contact`). Sample content lives in
`src/templates/sampleSite.ts`. The route 404s in production.

## Security notes

- AI routes (`/api/ai/*`) and `/api/debug/*` require a signed-in admin (`Authorization: Bearer <supabase token>`),
  checked by `src/lib/supabase/requireAdmin.server.ts`. AI routes are rate-limited per user.
- Admin-only writes are enforced by RLS (`public.is_admin()`), not just the client-side `RequireAdmin` guard.
- Admins manage only the sites they created (`sites.created_by`, `public.is_site_admin(site)`); super admins
  (`admin_users.is_super`) manage every site and are the only ones who can add or remove admins. Sites created before
  migration 012 have no creator and are visible to super admins only until one is reassigned
  (`update public.sites set created_by = '<admin uuid>' where slug = '<slug>'`).

## Docs

`docs/` — domain setup and troubleshooting guides.
