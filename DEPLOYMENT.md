# Deployment — Cloudflare Pages (D1 + KV)

Randevou deploys to **Cloudflare Pages** with **D1** (database) and **KV**
(session cache + rate-limit counters). The intended public production domain is
**https://randevou.octolabs.app** — the default `randevou.pages.dev` URL is
internal only and must never be customer-facing.

## Current state (2026-06-15) — truthful status

- **Local checks: GREEN.** `npm ci`, `npm run typecheck`, `npm run build`, and
  `npm run lint` (0 errors; 6 known shadcn/ui fast-refresh warnings) all pass on
  this machine. Exact results are in the task report / commit messages.
- **Cloudflare resources: CREATED.** `randevou-db` (D1, id
  `de89f943-0ad7-452f-9dba-e9bf27df839f`) and `randevou-sessions` (KV, id
  `e4babc1547ca4b7b8f2aaad412801836`) exist and have migrations **0001 + 0002 +
  0003** applied (verified: 10 tables incl. `admin_audit_events`). Migration
  **0004** adds optional Google owner account linking and must be applied before
  deploying code that exposes Google login. These IDs are
  already wired into `wrangler.toml`.
- **Production is live at `https://randevou.octolabs.app`.** This hardening /
  Google-account batch has **not** been deployed or migrated yet from this
  workspace. Apply migration **0004** before deploying this code, because owner
  session reads now include the Google account columns.

## Preflight (re-run before deploying)

```bash
npm ci
npm run typecheck
npm run build
npm run lint
```

## One-time Cloudflare setup (run by the founder)

```bash
npm install -g wrangler
wrangler login                       # opens browser; authorise the Octolabs account

# 1. D1 + KV already exist (IDs in wrangler.toml). Only recreate if you can't
#    access the existing ones — then update wrangler.toml with the new IDs:
#    wrangler d1 create randevou-db
#    wrangler kv namespace create randevou-sessions

# 2. Migrations are already applied to the existing randevou-db. If you create a
#    NEW database, apply all migrations IN ORDER:
wrangler d1 execute randevou-db --remote --file=migrations/0001_rezavu_core.sql
wrangler d1 execute randevou-db --remote --file=migrations/0002_booking_rules.sql
wrangler d1 execute randevou-db --remote --file=migrations/0003_admin_and_billing.sql
wrangler d1 execute randevou-db --remote --file=migrations/0004_google_owner_accounts.sql

# 3. Build:
npm run build

# 4. Create the Pages project + deploy (this is what makes it live):
wrangler pages deploy ./dist --project-name=randevou

# 5. Required vars/secrets:
#   SITE_URL and ADMIN_EMAILS are non-secret runtime vars in wrangler.toml [vars].
#   Do not rely on Cloudflare dashboard runtime vars in advanced mode.
# Optional — messaging (without these, messages log instead of send):
wrangler pages secret put TWILIO_ACCOUNT_SID --project-name=randevou
wrangler pages secret put TWILIO_AUTH_TOKEN --project-name=randevou
wrangler pages secret put TWILIO_WHATSAPP_FROM --project-name=randevou
# Optional — Google owner sign-in / linking:
#   Set GOOGLE_CLIENT_ID in wrangler.toml [vars].
wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=randevou
# Optional — billing (only when a provider is approved; see ENVIRONMENT_VARIABLES.md):
#   PADDLE_* (primary) or DODO_* (backup). PayPal manual needs no secrets.
#   Stripe is future-only — there are no active Stripe secrets.
```

> Migration filenames keep the historical `0001_rezavu_core.sql` name on purpose
> (renaming a migration that has already run risks breaking migration tracking).
> The product is **Randevou**; only the old filename remains.

## Pages project name (reservly → randevou)

No Pages project has been deployed yet, so there is **nothing to rename** — just
create it as `--project-name=randevou` in step 4. (If a leftover `reservly`
Pages project ever appears in the dashboard, delete it; it was never served.)

## Custom domain (hides pages.dev from users)

1. Cloudflare dashboard → Pages → **randevou** → **Custom domains** → add
   `randevou.octolabs.app`. Since `octolabs.app` is already on Cloudflare, the
   CNAME is created automatically.
2. Set build env vars (Pages → Settings → Environment variables, Production):
   - `VITE_SITE_URL=https://randevou.octolabs.app`
   - `SITE_URL=https://randevou.octolabs.app` stays in `wrangler.toml` `[vars]`
3. Re-deploy after setting build vars (`VITE_` vars are baked at build time).

**What can and cannot be hidden:**

- `randevou.pages.dev` always exists — Cloudflare does not allow deleting the
  default Pages subdomain. The Worker now returns 503 for non-canonical hosts,
  including `randevou.pages.dev`.
- Everything customer-facing (dashboard share link, WhatsApp messages, booking
  confirmations, canonical metadata) is generated from `SITE_URL` /
  `VITE_SITE_URL`, so with the vars above users only ever see
  `randevou.octolabs.app`. There are no hardcoded `pages.dev` links in the app.
- Optionally add a Bulk Redirect `randevou.pages.dev/*` →
  `https://randevou.octolabs.app/$1` so direct visits also land on the real
  domain.

## Webhooks (after the domain is live)

- Twilio WhatsApp inbound: `https://randevou.octolabs.app/api/twilio/inbound`
  (the handler verifies `X-Twilio-Signature`).
- Google OAuth redirect URI, if enabled:
  `https://randevou.octolabs.app/api/auth/google/callback`.

## Manual checks after deploy

- Create an owner account (sign-up happens before onboarding step 1).
- Complete onboarding; open the public booking link.
- Create a booking; confirm the dashboard shows it and the confirmation shows a
  booking reference (e.g. `RDV-8K2Q`).
- Reply `/cancel` (or `/cancel RDV-XXXX`) on WhatsApp; verify the booking
  cancels and the customer/owner are notified.
- Settings → Booking rules: change minimum notice / advance window / slot
  interval / no-same-day and confirm the public slot grid reacts.
- Manually POST an invalid `startAt` to `/api/public/bookings`; it must be
  rejected ("That time isn't available").
- Visit `/admin` as a non-admin owner → 403 "Platform admins only".
- Visit `/admin` as an `ADMIN_EMAILS` owner → dashboard loads; test plan
  override, mark-paid, and booking confirm/cancel; confirm each appears in the
  Audit Log.
- Confirm `randevou.octolabs.app` serves the app and `pages.dev` is not linked
  anywhere user-facing.
