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
   GROQ_API_KEY=...                     # AI generator (default provider)
   GEMINI_API_KEY=...                   # AI generator (optional)
   ```

3. In the Supabase SQL editor run, in order:
   - `supabase/schema.sql`
   - `supabase/migrations/*.sql` (numbered order)
   - `supabase/fixes/fix_storage_rls.sql` (bucket `site-assets`)
   - `supabase/admin/add_current_user_as_admin.sql` (after creating your user)
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

## Docs

`docs/` — domain setup and troubleshooting guides.
