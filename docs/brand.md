# Sulva Sites — app and brand brief

Reference for anyone designing for Sulva Sites (logo, social graphics, decks). Colours and fonts below are the
ones in code today: `src/app/globals.css` (koi design system) and `src/app/layout.tsx` (fonts).

---

## 1. The app

| | |
| --- | --- |
| **Name** | Sulva Sites (two words, capital S on both). Never "SulvaSites" or "Sulva sites". |
| **Company** | Sulvatech |
| **What it is** | A website builder for Nigerian small businesses. Pick a design, fill it in yourself or with AI, publish today. |
| **One-liner** | "Your business website, live today." |
| **Main site** | https://sulvasites.sulvatech.com |
| **Customer sites** | `<name>.soothecontrols.site` or the business's own domain (e.g. `mybakery.com.ng`) |
| **Market** | Nigeria. Prices in naira (₦), payments by Paystack, orders by WhatsApp. |

### Who it is for

Small business owners who need a proper website but have no designer or developer: bakers, salons, clinics,
gyms, schools, churches, car dealers, fashion brands, shops, restaurants, builders, writers. Many run their
business from a phone and WhatsApp.

### Two ways to buy

1. **Do it yourself.** Sign up, choose a template and the setup assistant builds a first draft. 7 days free, no card.
2. **Have us build it.** Send a brief (form or WhatsApp) and the Sulvatech team designs, writes and launches it.
   One-time setup fee, then the same monthly plan.

### Pricing (NGN)

| Plan | Monthly | Done-for-you setup |
| --- | --- | --- |
| Starter | ₦10,000 | ₦150,000 |
| Business | ₦20,000 | ₦300,000 |
| Commerce | ₦35,000 | ₦450,000 |

- Annual = 10 × monthly (2 months free).
- **Launch offer:** every plan at a third of the price (₦3,500 / ₦7,000 / ₦12,000 a month), kept for life by
  everyone who joins before the offer ends.
- Domain add-on, bought and managed by us: `.com` ₦25,000/yr, `.com.ng` ₦15,000/yr.

### What every site gets

- 17 professional templates, each with its own look (most have light and dark modes)
- AI help: setup chat that drafts the site, rewrite, SEO and "Ask AI" (add products, change text by chat)
- Blog on every site (`/blog`, tags, RSS feed)
- Enquiry and booking forms into an owner inbox, with email alerts
- Online shop and food ordering: cart, Paystack card checkout, WhatsApp ordering, or both
- Owner dashboard: edit content, publish, manage staff, see orders and insights
- Custom domain support, free subdomain, fast hosting on Vercel

### Templates

| Key | Name | Category |
| --- | --- | --- |
| t1 | Meridian | Corporate |
| t2 | Journal | Editorial |
| t3 | Atelier | Portfolio |
| t4 | Launch | Product / app |
| t5 | Maison | Beauty & booking |
| t6 | Estate | Real estate |
| t7 | Tavola | Restaurant (online ordering) |
| t8 | Vital | Clinic & health |
| t9 | Pulse | Fitness |
| t10 | Campus | Education |
| t11 | Soirée | Events |
| t12 | Forge | Trades & construction |
| t13 | Mode | Fashion shop |
| t14 | Cartly | General store |
| t15 | Marque | Automotive |
| t16 | Circle | Community |
| t17 | Folio | Blog & publication |

---

## 2. Brand idea: "koi"

The Sulva Sites look is a **koi pond**: deep blue water, light ripples and one bright orange koi. The water
stands for calm and trust (your site just works). The koi is the business itself, the one bright thing people
notice. The login screen literally shows koi swimming under rippling water.

**Personality:** calm, confident, modern, friendly, local. Clear, plain language, never techy.
Says "your website, live today", not "leverage our platform".

---

## 3. Colours

### Core palette

| Token | Hex | RGB | Role |
| --- | --- | --- | --- |
| `koi-ink` | `#0A0F1F` | 10, 15, 31 | Main text, dark surfaces, promo bar. Near-black navy, never pure black. |
| `koi-deep` | `#0A4FE0` | 10, 79, 224 | **Primary brand blue.** Buttons, links, the "Sites" accent in the wordmark. |
| `koi-sea` | `#1B8CFF` | 27, 140, 255 | Secondary blue: water, highlights, hover. |
| `koi-foam` | `#7FD0FF` | 127, 208, 255 | Light blue: ripples, glows, soft accents on dark/blue. |
| `koi-orange` | `#FF5A2C` | 255, 90, 44 | **Accent: the koi.** Use sparingly, a dot or one highlight per screen. |
| `koi-paper` | `#F4F7FC` | 244, 247, 252 | Page background. Cool off-white, never warm cream. |
| `koi-line` | `rgba(10,15,31,0.08)` | — | Hairline borders and dividers. |

**Proportion guide:** about 60% paper/white, 25% ink, 12% blues, 3% orange.

### Water gradient (hero bands, login screen)

```css
background:
  radial-gradient(60% 80% at 75% 35%, rgba(127,208,255,.55), transparent 60%),
  radial-gradient(80% 90% at 20% 110%, rgba(127,208,255,.6), transparent 55%),
  linear-gradient(160deg, #0A3FC4 0%, #0A4FE0 35%, #1B8CFF 75%, #4FB6FF 100%);
```

Extra stops used only in this gradient: `#0A3FC4` (darker deep) and `#4FB6FF` (bright sky).

### Glass

Frosted panels sit on the water: white at 14% opacity, a 28% white border and a 14px background blur.
On white content the dark version is ink at 78% opacity.

### Contrast (WCAG)

| Pair | Ratio | OK for |
| --- | --- | --- |
| Ink on paper | ~17.6 : 1 | Everything |
| White on deep blue | ~6.6 : 1 | Everything (AA body text) |
| Sea blue on white | ~3.4 : 1 | Large text, icons only |
| Orange on white | ~3.1 : 1 | Large text, icons and shapes only, **never small text** |

---

## 4. Typography

| Use | Font | Notes |
| --- | --- | --- |
| UI, body, headlines | **Inter Tight** (Google Fonts) | Semibold (600) for headlines with tight tracking (−0.03em). Regular for body. |
| Accent words | **Instrument Serif**, *italic* (Google Fonts) | One or two words per headline for warmth, e.g. "Welcome back *to Sulva Sites*". |

Fallbacks: `ui-sans-serif, system-ui` and `ui-serif, Georgia`.

---

## 5. Logo

Sulva Sites uses the **Sulvatech "S"** (same mark as https://sulvatech.com): two half-pill shapes split by a
diagonal cut. It is **monochrome**: ink on light backgrounds, white on dark or water. The koi colours stay in
the UI, not in the mark.

| | |
| --- | --- |
| **Mark path** (viewBox `0 0 274 329`) | `M89 92.5C89 37 126 0 181.5 0S274 37 274 92.5L89 185ZM185 236.5C185 292 148 329 92.5 329S0 292 0 236.5L185 144Z` |
| **Lockup** | Mark + "Sulva" (Inter Tight semibold) + "*Sites*" (Instrument Serif italic, `koi-deep`) |
| **App icon** | White S on a `koi-ink` tile, corner radius 112 / 512 (as on sulvatech.com) |
| **Clear space** | At least half the mark's width on every side |
| **Minimum size** | 12px tall for the mark (badge), 16px for the favicon |

Don't recolour the S purple or orange inside the app, add effects or gradients, rotate it, or set it
in another typeface.

### Files

| File | Use |
| --- | --- |
| `public/brand/sulva-mark.svg` / `sulva-mark-white.svg` | Mark only, ink / white |
| `public/brand/sulva-icon.svg` | Favicon (ink tile, white S) |
| `public/brand/sulva-icon-512.png` | Android, PWA, social avatar |
| `public/brand/apple-icon.png` | 180×180 iOS home screen (square, iOS rounds it) |

### In code

- `src/components/ui/Logo.tsx`: `<SulvaMark />` (uses `currentColor`), `<Logo />` lockup, `SULVA_MARK_PATH`
- Marketing header and footer use `<Logo />`; login card and admin/dashboard nav use `<SulvaMark />` in white
- "Built with Sulva Sites" badge on customer sites shows the mark: `src/components/site/SulvaBadge.tsx`
- Favicons are set as `metadata.icons` in `src/app/layout.tsx`, **not** `app/icon.svg`, because file-based icons
  would override each customer site's own favicon. `/brand/*` bypasses host routing so it loads on customer domains too.

### Sulvatech parent palette (for reference only, not used in the app UI)

| Name | Hex |
| --- | --- |
| Navy | `#0A2353` |
| Purple | `#C75EFF` |
| Cyan | `#56E1E9` |
