# Bookings and enquiries inbox (back-office part 2)

Date: 2026-10-05. Depends on: owner accounts (005, 007), commerce hardening style (006).

## Goal
Visitor submits the contact/booking form on any template (t1-t14) -> row in `inbox_messages` ->
email to the business -> owner/staff triage in the dashboard (`/dashboard/[siteId]/inbox`), admins
in `/admin/sites/[siteId]/inbox`.

## Data (migration 008_inbox.sql)
`inbox_messages(id, site_id, kind enquiry|booking, name, email, phone, message, extra jsonb,
status new|read|replied|archived, source_page, spam_score, is_spam, notified_at, created_at, updated_at)`.
- RLS on, `revoke all` from anon/authenticated, then: select + `update (status)` + delete to authenticated.
- Policies: select/update = `is_site_member(site_id)` (admins included; gated by must_change_password
  through site_role, migration 007); delete = `is_admin()`. No insert policy/grant: inserts only through
  the service role (public API).
- Guard trigger (not SECURITY DEFINER, like 006): client roles may change `status` only; status must be
  one of the four values; updated_at maintained.
- Checks: length caps, `extra` is an object <= 4 KB, at least one of email/phone.
- PII: no anon access at all; service_role bypass only.

## Public API `POST /api/sites/[siteId]/inbox`
No auth. Steps: canonical lowercase UUID -> per-IP limit (5 / 10 min) -> body cap 16 KB -> strict
pure parse (`src/lib/inbox/input.ts`) -> honeypot (`website` field filled: pretend success, store nothing)
-> service client -> site must be `published` -> per-site limit (60 / 10 min, after validation) ->
insert (spam score >= 4 stored with `is_spam`, no email) -> email via Resend REST when `RESEND_API_KEY`
+ `RESEND_FROM` set and `business_profiles.email` valid; failure is soft (message already stored; log
without PII). Generic error strings; always `Cache-Control: no-store`.

Payload: `{ kind?, fields: {name,email,phone,message|notes|details,...}, website?, sourcePage? }`.
Known fields map to columns; any other short `[a-z_]` key goes to `extra` (date, time, guests, service...).
Name required; email or phone required; enquiry requires message.

## Templates
One shared hook `useInboxForm` + `InboxHoneypot` + `InboxStatus` in `src/templates/shared/`; site id comes
from `InboxSiteProvider` wrapping the template in `PublicSitePage`. Each ContactCard swaps its `alert()`
stub for the hook. Without a provider (admin preview, dev) the form says it is a preview.

## Dashboard
Shared `InboxView` component (`siteId`, `role`): filters (status, kind), search, list + detail,
mark read/replied/archived (client update of `status` under RLS), mailto / tel / wa.me reply links,
spam hidden. Unread badge on the Inbox tab in `SiteShell` (count query, owner/staff/admin).

## Out of scope
Auto-reply to visitor, attachments, captcha, pagination beyond 300 newest, realtime.

## USER ACTION
Run 008 + test SQL; set `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_SITE_ORIGIN` env.
