# Commerce: shop core, Paystack checkout, shop admin, t13/t14 templates

Date: 2026-10-04 · Status: approved

## Goal

Real online shops on Sulva Sites: product catalogue, cart, Paystack checkout, orders, and a shop admin —
plus two e-commerce templates: **t13 fashion boutique** and **t14 general store**.

## Decisions

- Full checkout now (not WhatsApp-only). Currency NGN; all money stored as integer **kobo**.
- Payment provider **Paystack**, two modes per shop (owner/admin chooses):
  - `platform` — Sulvatech's Paystack account; the shop is a **subaccount** (created via API from bank details); settlement goes to the shop's bank; optional platform fee % per site (default 0).
  - `own_keys` — the shop's own Paystack secret key, stored **encrypted** (AES-256-GCM, server key `SHOP_SECRETS_KEY`); public key stored plain.
- Delivery: flat delivery fee per shop + optional "pickup" option (zones later).
- Guest checkout only (name, email, phone, delivery address or pickup).
- Emails: Paystack's customer receipt now; owner notifications arrive with back-office part 2.
- **Shop admin is first-class**: products, categories, orders and payment settings managers. They live in `/admin/sites/[siteId]/shop/*` now (owner dashboard is blocked) and are built as shared components (`src/components/shop-admin/*`) so `/dashboard/[siteId]/shop/*` reuses them when the dashboard ships.
- Permissions reuse `site_members` helpers from migration 005 (`is_site_member`, `can_edit_site`).

## Data model — `supabase/migrations/006_commerce.sql`

```text
shop_settings(site_id pk→sites, enabled bool default false, currency text default 'NGN',
  delivery_fee_kobo int default 0 check >=0, pickup_enabled bool default false, pickup_note text,
  payment_mode text check in ('platform','own_keys') null, paystack_public_key text null,
  platform_fee_bps int default 0 check 0..10000, updated_at)
shop_payment_secrets(site_id pk→sites, subaccount_code text null, settlement_bank text null,
  account_last4 text null, secret_key_ciphertext text null, secret_key_last4 text null, updated_at)
  -- RLS enabled, NO client policies (service role only)
product_categories(id uuid pk, site_id, name, slug, position int, unique(site_id, slug))
products(id uuid pk, site_id, category_id null, name, slug, description text, images jsonb default '[]'
  (array of {url, alt}), price_kobo int check >=0, compare_at_kobo int null, active bool default true,
  featured bool default false, position int, created_at, updated_at, unique(site_id, slug))
product_variants(id uuid pk, product_id→products cascade, site_id, options jsonb ({"Size":"M","Colour":"Black"}),
  price_kobo int null (override), stock int null (null = untracked) check >=0, sku text null, position int)
orders(id uuid pk, site_id, reference text unique, status text check in
  ('pending','paid','fulfilled','cancelled','refunded') default 'pending',
  customer_name, customer_email, customer_phone, delivery_method text check in ('delivery','pickup'),
  delivery_address text null, notes text null, subtotal_kobo, delivery_kobo, total_kobo,
  payment_mode text, paystack_reference text null, paid_at timestamptz null, stock_issue bool default false,
  amount_mismatch bool default false, created_at, updated_at)
order_items(id uuid pk, order_id→orders cascade, site_id, product_id null, variant_id null,
  name text, variant_label text null, unit_price_kobo int, quantity int check >0, line_total_kobo int)
```

RLS:
- Public (anon+authenticated) **select** active products/variants/categories and `shop_settings` (enabled, currency, fees, pickup, payment_mode, public key) **only for published sites** (`exists published site`).
- Members (`is_site_member`) select everything for their site incl. orders/order_items; owners (`can_edit_site`) write products/variants/categories/shop_settings; members may **update orders.status** (column-guard trigger: members may change only `status`; staff may not set `refunded`).
- Orders/order_items **insert only via service role** (no client insert policy).
- `shop_payment_secrets`: no client policies at all.
- Stock decrement: SQL function `public.mark_order_paid(p_order uuid, p_paystack_ref text, p_amount_kobo int)` (security definer, executable only by service_role) — in one transaction: assert status = 'pending' and amount = total, set paid, decrement tracked variant stock (never below 0; if insufficient, still mark paid and flag `stock_issue = true` column on orders for the owner to resolve). Idempotent (returns early if already paid).

## Server — `src/lib/shop/*` (pure parts tested) and API routes

Pure (relative imports, unit-tested):
- `money.ts`: `formatNaira(kobo)`, `toKobo(naira)`, `platformFeeKobo(total, bps)`.
- `cart.ts`: cart line shape `{productId, variantId|null, quantity}`; `addLine`, `setQty`, `removeLine`, `cartCount`; localStorage key per site `sulva-cart-<siteId>` (helpers wrap try/catch).
- `pricing.ts`: `priceCart(lines, products, variants, settings, deliveryMethod)` → `{items:[{…unit, qty, lineTotal, name, variantLabel}], subtotal, delivery, total, problems:[{lineIndex, reason:'unavailable'|'out_of_stock'|'insufficient_stock', available?}]}` — authoritative on the server.
- `paystackSignature.ts`: `verifyPaystackSignature(rawBody, signatureHeader, secret)` (HMAC-SHA512 hex, timing-safe compare).
- `secretBox.ts`: `encryptSecret(plain, keyB64)` / `decryptSecret(cipher, keyB64)` (AES-256-GCM, `v1:iv:tag:data` base64).

Routes:
- `POST /api/shop/[siteId]/checkout` — body `{lines, customer, deliveryMethod, address?, notes?}`; validates (zod-free manual validation), loads published site + shop (service client), `priceCart`, rejects problems (409 with details), creates `orders` + `order_items` (pending, unique reference `SV-<base36 time>-<rand>`), initializes Paystack transaction (`POST https://api.paystack.co/transaction/initialize` with `amount=total_kobo`, `email`, `reference`, `callback_url=<site origin>/order/<reference>`, `metadata:{site_id, order_id}`, and in platform mode `subaccount` + `transaction_charge` = platform fee kobo + `bearer:'subaccount'`), returns `{authorizationUrl, reference}`. Rate-limited per IP.
- `GET /api/shop/[siteId]/orders/[reference]/verify` — server verifies with Paystack (`GET /transaction/verify/:ref` using the right secret), calls `mark_order_paid` when success & amount matches; returns public order summary (no PII beyond first name).
- `POST /api/paystack/webhook` (platform mode, platform secret) and `POST /api/paystack/webhook/[siteId]` (own-keys, that shop's decrypted secret) — verify signature on raw body, handle `charge.success` → verify via API → `mark_order_paid`. Always 200 quickly after verification.
- `POST /api/admin/sites/[siteId]/shop/payment` — admin/owner sets mode: `platform` with `{bankCode, accountNumber, businessName}` → Paystack `POST /subaccount` (platform secret, `percentage_charge` = fee) → store code + last4; or `own_keys` with `{publicKey, secretKey}` → validate by calling `GET /balance` or `/transaction?perPage=1` → encrypt + store, return masked. `GET` returns masked status only. Also `GET /api/shop/banks` proxying Paystack bank list (cached).
- Env: `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (platform), `SHOP_SECRETS_KEY` (32-byte base64), `NEXT_PUBLIC_SITE_ORIGIN` fallback for callback URLs. Test keys first.

## Storefront (shared, any template with `shopEnabled`)

- Public routes for subdomain/custom-domain/slug sites mirroring existing routing: `/shop`, `/shop/c/[category]`, `/shop/[product]`, `/cart`, `/checkout`, `/order/[reference]` (and slug/d variants). Host routing (`hostRouting.ts`) must pass these through like other paths.
- Loader `loadShop(siteId)` (server, service-free public RLS) → settings, categories, active products+variants.
- Templates render shop pages via new optional template props: `shop?: ShopData`, `shopView?: {kind:'list'|'category'|'product'|'cart'|'checkout'|'order', …}`. Templates t1–t12 ignore them (shop routes 404 unless template supports shop: `TEMPLATE_META.shop = true` for t13/t14).
- Client: `useCart(siteId)` hook (localStorage, cross-tab sync via `storage` event), cart drawer, checkout form → POST checkout → redirect to Paystack → callback `/order/[ref]` page calls verify endpoint and shows status (paid / pending / failed with retry).

## Shop admin (Sulvatech admin now, owner dashboard later)

`/admin/sites/[siteId]/shop` with tabs; components in `src/components/shop-admin/`:
- **Overview**: enable shop toggle, delivery fee, pickup + note, payment status card.
- **Products**: list (search, category filter, active toggle, drag/position), editor (name, slug auto, description, images via existing `ImageField` + multi-image, price, compare-at, category, featured, variants table with option names/values generator e.g. Size × Colour, per-variant price/stock/sku).
- **Categories**: CRUD + order.
- **Orders**: inbox (status filter, search by ref/name), detail (items, totals, customer, delivery, Paystack ref, stock issue flag), status actions (mark fulfilled / cancelled; refunded admin/owner only — Paystack refund itself out of scope, manual).
- **Payments**: mode chooser; platform → bank select (from `/api/shop/banks`) + account number + business name → create subaccount; own keys → public + secret key fields (secret never shown again, masked last4); fee % (admin only).
- Sidebar link "Shop" on `/admin/sites/[siteId]` for sites whose template supports shop.

## Templates

Both follow all t7–t12 conventions (palette vars + config, dark mode, per-page heroes, inline editing rules, a11y, no invented facts, sample site with stock photos — add `fashion` and `retail` stock data; sample shop data provided in `sampleSite.ts` via a `sampleShop(templateKey)` for `/dev/templates/tN/shop…` previews).
- **t13 "Mode"** fashion boutique — editorial lookbook home (full-bleed campaign image, shoppable looks from featured products), product grid with hover second image, product page with gallery, size/colour swatches, size-guide drawer (from a rich-text extra page or default table), slide-out cart, minimal checkout. Fonts: "Italiana" display + "Manrope". Palette: accent #b4532a (terracotta), accent2 #121212, ink #121212, muted #6e6a66, bg #fbfaf7, surface #f1eee8.
- **t14 "Cartly"** general store — top bar with search + categories mega-menu, deals strip (compare-at), dense responsive product grid with quick-add, filters (category, price range, in stock), product page with variant select + stock badge, sticky mobile cart bar. Fonts: "Inter Tight" + "Inter". Palette: accent #1f6feb, accent2 #0e1726, ink #0f172a, muted #5b6475, bg #ffffff, surface #f3f5f9.
- Presets: t13 `shop` (Shop), `lookbook` (Lookbook: hero, gallery, contact_card), `size-guide` (Size guide: hero, richtext, faq); t14 `shop` (Shop), `deals` (Deals: hero, richtext, contact_card), `help` (Help & delivery: hero, faq, contact_card). The `shop` preset page links to `/shop`.

## Error handling

- Checkout: stock/price changes → 409 with per-line problems shown in cart; Paystack init failure → 502, order stays pending (expires: pending orders older than 24h hidden from inbox by default).
- Webhook: bad signature → 401; unknown site/order → 200 (ignore) with log; amount mismatch → do not mark paid, flag order.
- Payment settings: Paystack API errors surfaced verbatim (safe), secrets never echoed.

## Testing

- Unit: money, cart, pricing (variants, overrides, stock, inactive, delivery/pickup), signature, secretBox round-trip/tamper.
- SQL: `supabase/tests/006_commerce_check.sql` (public sees only active products of published sites; members read orders; staff can't change prices; orders not insertable by clients; secrets unreadable; mark_order_paid idempotent + stock decrement).
- Paystack test mode end-to-end in browser (test card) for both payment modes once keys are configured.
- Visual: t13/t14 desktop + 375, light/dark, shop pages.

## Out of scope

Refund API, delivery zones, discount codes, inventory history, customer accounts, email notifications (part 2), tax/VAT.
