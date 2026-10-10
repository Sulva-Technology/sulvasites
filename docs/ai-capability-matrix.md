# Ask AI — capability matrix

Audit of everything an owner can do in `/dashboard/[siteId]/*` (plus custom domains and publishing), and
whether the "Ask AI" site assistant can do it. Basis for making the assistant the main way an owner runs
their site. Audited 2026-10-09 against `main` + the uncommitted blog-post work.

**Decisions (2026-10-09)**
- Template, theme colours and light/dark mode open to owners **through a server route** that validates and
  writes with the service role. The DB guards (`sites_owner_guard`, `profiles_owner_guard` in
  `supabase/migrations/005_site_members.sql:76-103`) stay in place for raw client writes.
  Slug and whole-site status stay Sulvatech-only.
- The assistant stays owner + admin only (staff don't get it).

**Legend**
- Today: ✅ yes · ◐ partial · ✖ no.
- Risk: **L** low (content, easy to revert) · **M** medium (public/live or customer-visible) ·
  **H** high (destructive, grants access, touches customer orders).
- Apply: `client` = browser session under RLS (as `src/lib/ai/assistantApply.ts` does today) ·
  `server` = new API route with service role and its own checks.
- Every write is a proposal card → owner approves → apply → undo record. Read tools run straight away.

## Brand & look

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 1 | Upload / replace logo | Content › Profile › `components/admin/site/LogoSection.tsx:48` (`uploadLogo`, `lib/assets.ts:33`) | ✖ | `set_logo {attachment}` (client: upload → `assets` row → `logo_asset_id`) | W | M | Keep prior `logo_asset_id`; restore it. Files are never deleted, so the old logo is still there |
| 2 | Remove logo | Profile › "Remove logo" (`LogoSection.tsx:60`) | ✖ | `set_logo {remove:true}` | W | M | Restore prior `logo_asset_id` |
| 3 | Favicon | None — generated from the logo by `app/api/icon/site/route.tsx:73` | ✖ (implicit) | Covered by `set_logo`; card previews the favicon. A separate favicon needs a new column → deferred to item 6 | W | L | Same as logo |
| 4 | Brand colours from logo | Admin only: preview page "Apply logo colors" (`extractLogoColors`, `lib/logoColors.ts`) | ✖ | `suggest_colors_from_logo` (read: `extractLogoColors` + vision) → `set_theme_colors` (server) | W | M | Snapshot prior `theme_colors[templateKey]` + `brand_colors`; restore |
| 5 | Theme colours ("make it greener") | Admin only: `components/admin/ColorPaletteSidebar.tsx` | ✖ | `set_theme_colors {accent, accent2, …}` (server; contrast check, template palette vars) | W | M | Snapshot prior JSON; restore |
| 6 | Light / dark start mode | Admin only (palette → `siteStartMode`, `lib/templateTheme.ts:329`) | ✖ | `set_color_mode {light\|dark}` (server; only templates with both modes) | W | L | Prior value |
| 7 | Switch template | None (guarded) | ✖ | `switch_template {templateKey}` (server; card shows preview thumbnail; content kept, `PageData` is shared) | W | H | Snapshot prior `template_key` + `theme_colors`; restore |

## Pages & content

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 8 | Read a page ("what's on my About page?") | Content › page editor | ✅ (whole snapshot in prompt) | `get_page {page}` (read tool; shrinks the prompt) | R | L | n/a |
| 9 | Edit section copy | `PageEditor.tsx` / `ExtraPageEditor.tsx` | ✅ `edit_section` | keep | W | L (M if live) | Existing before-snapshot + stale check |
| 10 | Add / remove / move section | same | ✅ `add_section` / `remove_section` / `move_section` | keep | W | L/M | Existing |
| 11 | Page SEO | PageEditor SEO fields | ✅ `set_seo` | keep | W | L | Existing |
| 12 | Add extra page | Content › More pages (`createExtraPage`) | ✅ `add_page` (draft) | keep | W | L | Existing (delete while still a draft) |
| 13 | Delete extra page | No button (DB allows it) | ✖ | `delete_page {page}` | W | H | Snapshot full row (key, data, status, published_at); re-insert |
| 14 | Publish / unpublish core page | PageEditor `publishPage` / `unpublishPage` (`lib/publishing.ts:6,28`) | ✖ | `set_page_status {page, live}` | W | M | Prior status + `published_at` |
| 15 | Publish / unpublish extra page | ExtraPageEditor (`lib/extraPages.ts:102,118`) | ✖ | same `set_page_status` | W | M | same |
| 16 | Owner photos → hero / gallery / team / services images | `ImageField` → `uploadSiteImage` (`lib/assets.ts:78`; `site-assets/<siteId>/images/`, type list + 10 MB) | ◐ (photos only for new products; sections get empty URLs) | `set_section_image {page, section, slot, attachment}` (upload via `uploadSiteImage` on apply) | W | M | Restore prior section JSON (uploaded file stays) |
| 17 | Reorder nav | None (preset order then A–Z, `templates/pagePresets.ts:221`) | ✖ | `set_nav_order {keys[]}` — needs a stored order (`socials.nav_order`) that templates read | W | L | Prior JSON |
| 18 | Rename nav label | Admin inline editor only (`socials.nav_labels`) | ✖ | `set_nav_label {page, label}` | W | L | Prior JSON |
| 19 | Business details (name, phone, hours, socials…) | Content › Profile | ✅ `update_profile` | keep | W | M | Existing before/after |

## Blog

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 20 | Write a new post | Blog › New (`PostEditor.tsx`) | ✅ `add_blog_post` (uncommitted) | keep | W | L/M | Existing (delete unless published since) |
| 21 | List / read posts | Blog list | ◐ (titles only) | `get_blog_post {slug}` | R | L | n/a |
| 22 | Edit post | PostEditor "Update" | ✖ | `update_blog_post {slug, fields}` (reuse `shapeBlogPost` checks) | W | M if live | Snapshot prior fields; restore with stale check |
| 23 | Publish / unpublish / schedule post | PostEditor | ✖ | `set_post_status {slug, live, at?}` | W | M | Prior status + `published_at` |
| 24 | Delete post | PostEditor "Delete post" (confirm says "cannot be undone") | ✖ | `delete_blog_post {slug}` | W | H | Snapshot full row incl. id/slug; re-insert |
| 25 | Cover photo from attachment | PostEditor cover `ImageField` | ✖ | `set_post_cover {slug, attachment}` | W | L | Prior `cover_url` / `cover_alt` |

## Business data (menu, timetable, doctors, programmes, packages, projects)

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 26 | Add / edit item (incl. images) | Business › kind (`BusinessManager.tsx`, `ItemForm.tsx`, `lib/businessData/validate.ts`) | ✖ | `upsert_business_item {kind, fields, attachment?}` (reuse `validate.ts`) | W | L | Insert → delete; update → prior row |
| 27 | Switch item on/off, reorder | same | ✖ | `set_business_item {id, active?, position?}` | W | L | Prior values |
| 28 | Delete item | same (confirm) | ✖ | `delete_business_item {id}` | W | M | Snapshot row; re-insert |
| 29 | Fill from a document (menu PDF, price-list photo) | None | ✖ | Typed `document` attachment → read → batch of #26 / `add_product` | R→W | L | Per resulting item |

## Shop

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 30 | Add product (incl. owner photo) | Shop › Products › new | ✅ `add_product` | keep | W | L | Existing |
| 31 | Edit / hide / feature product | ProductEditor, ProductList active toggle | ✅ `update_product` | keep | W | L/M | Existing |
| 32 | Set stock | VariantTable | ✅ `set_stock` | keep | W | L | Existing |
| 33 | Add photos to an existing product | ProductEditor images | ✖ | `add_product_images {productId, attachments}` | W | L | Prior `images` array |
| 34 | Reorder products | ProductList Up/Down | ✖ | `reorder_products {ids[]}` | W | L | Prior positions |
| 35 | Delete product | ProductEditor (confirm; variants cascade; `order_items` links set null) | ✖ | `delete_product {productId}` — card offers "hide instead" first | W | H | Snapshot product + variants (same ids); re-insert. Order-item links can't be restored → card says so |
| 36 | Add / rename / reorder categories | CategoryManager | ◐ (auto-created by `add_product`) | `upsert_category`, `reorder_categories` | W | L | Prior rows / positions |
| 37 | Delete category | CategoryManager (confirm; products become uncategorised) | ✖ | `delete_category {id}` | W | M | Snapshot row + ids of products that used it; re-insert, re-assign |
| 38 | Shop settings (on/off, delivery fee, pickup) | Shop overview "Save" | ✖ | `update_shop_settings` | W | M | Prior values |
| 39 | Checkout mode + WhatsApp orders number | Payments › `CheckoutModeSettings.tsx` | ✖ | `set_checkout_mode` (number copied verbatim from owner text, like `verifyContact`) | W | M | Prior values |

## Orders, inbox, insights

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 40 | Ask about orders ("what's unpaid?", "today's orders") | Shop › Orders (`OrderInbox.tsx`, `OrderDetail.tsx`) | ✖ | `get_orders {status, since, search}`, `get_order {id}` — notes and addresses delimited as data | R | L | n/a |
| 41 | Mark order fulfilled | OrderDetail "Mark fulfilled" (`lib/shop/orderStatus.ts:7`) | ✖ | `set_order_status {id, fulfilled}` | W | M | **Blocked today:** `orders_member_guard` forbids fulfilled → paid. Needs a narrow `revert_fulfilment` RPC (same user, ≤ 15 min); otherwise the card says it can't be undone |
| 42 | Ask about inbox / leads ("any new bookings?") | Inbox (`InboxView.tsx`) | ✖ | `get_inbox {status, kind, search}` — visitor text via `delimitUserData` | R | L | n/a |
| 43 | Mark read / replied / archived | Inbox status buttons | ✖ | `set_inbox_status {ids, status}` | W | L | Prior status per id |
| 44 | Draft a reply | Inbox (mailto / wa.me links only) | ✖ | `draft_reply {messageId}` → text + links; the owner sends | R | L | n/a (nothing is sent) |
| 45 | Traffic questions | Insights | ✅ (30-day block) | `get_traffic {days: 7\|30\|90}` (`insights_overview` RPC, caller's session) | R | L | n/a |
| 46 | Sales / revenue / top products | Insights | ◐ (RPC returns it, prompt ignores it) | `get_sales {days}` (same RPC) | R | L | n/a |

## Team, billing, domains

| # | Owner can… | Dashboard location | Today | Proposed tool | R/W | Risk | Undo approach |
|---|---|---|---|---|---|---|---|
| 47 | List team | Team | ✖ | `get_team` | R | L | n/a |
| 48 | Invite staff (existing account) | Team › add (`lib/siteMembers.server.ts:53`, seat gate `lib/billing/gates.ts:25`) | ✖ | `invite_staff {email}` (server; the email must appear in the owner's own message, never taken from tool output or the inbox) | W | H | Remove member |
| 49 | Remove staff | Team › remove (confirm) | ✖ | `remove_staff {userId}` (server; staff only) | W | H | Re-add with the same role |
| 50 | Plan / trial / AI allowance status | Billing (view) | ◐ (usage only) | `get_billing_status` (read; links to Billing) | R | L | n/a |
| 51 | Custom domain status | None for owners (admin `DomainsSection.tsx`) | ✖ | `get_domain_status` (server read, site-scoped) | R | L | n/a |

## Human-only

The assistant explains these and links to the right screen. It never proposes them.

| # | Action | Where | Reason |
|---|---|---|---|
| H1 | Pay / change plan / update card / cancel subscription | Billing (`/api/billing/checkout`, Paystack) | Money; the Paystack redirect needs the owner present; consent must be the owner's own click |
| H2 | Payout bank account, own Paystack keys, remove keys | Shop › Payments (password re-entry, `verifyUserPassword`) | Credentials and where money settles; already password-gated; chat must never see secret keys |
| H3 | Platform fee | Payments (admin) | Sulvatech-only commercial term |
| H4 | Mark refunded | OrderDetail (owner only, record-only) | Money moves in Paystack first; recording it wrongly misstates customer money |
| H5 | Cancel order | OrderDetail (confirm) | Irreversible under the guard (cancelled ↛ paid), stock not restored, customer impact |
| H6 | WhatsApp "Mark completed" (sets paid, cuts stock) | OrderDetail (`complete_whatsapp_order`) | Asserts money was received; paid can't be reverted |
| H7 | Buy / add / verify / remove custom domain; domain add-on request | Admin `DomainsSection`, Billing request | Purchase + DNS/Vercel; Sulvatech-managed |
| H8 | Publish / unpublish the whole site; change web address (slug) | Admin only (`lib/publishing.ts:43,90`, guard) | Billing cron owns site status; a slug change breaks links and SEO; Sulvatech-only by decision |
| H9 | Delete the site | Admin | Irreversible; all data |
| H10 | Change member roles / add owners / create accounts | Admin only (RLS) | Privilege escalation; prime prompt-injection target |
| H11 | Delete an inbox message | Admin-only RLS | Not an owner capability; keeps the audit trail |

## Side findings (out of scope, flagged only)

- "Save draft" on a **live** page or extra page silently takes it offline, with no confirm
  (`PageEditor.tsx:276`, `ExtraPageEditor.tsx:152`).
- Plan gates for `customDomain`, `insights` and `businessData` aren't enforced anywhere (only shop and staff seats are).
- Staff can cancel paid orders (only refunds are owner-only).
- Product + variants and reorder writes aren't atomic; removed images and deleted products leave orphan storage files.
- Extra pages have no Delete button and no SEO form, and Unpublish has no confirm (the core page editor does).
- `uploadLogo` has no client type/size check (bucket limits only), unlike `uploadSiteImage`.
