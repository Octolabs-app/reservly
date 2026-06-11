# Deployment — Cloudflare Pages (D1 + KV)

Reservly deploys to **Cloudflare Pages** with **D1** (database) and **KV**
(session cache). The public production domain is
**https://reservly.octolabs.app** — the default `reservly.pages.dev` URL is
internal only and must never be customer-facing.

## Current state (2026-06-11)

- `reservly.pages.dev` answers **522** — the Pages project is not serving the
  app yet (no successful deployment, or the project name is held elsewhere).
- `reservly.octolabs.app` has **no DNS record** — custom domain not configured.
- No Cloudflare credentials exist on this machine (`wrangler whoami` →
  not authenticated). **Every step below needs Allan to run `wrangler login`
  once (or create an API token).**

## Preflight (already green locally)

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

## One-time Cloudflare setup (run as Allan)

```bash
npm install -g wrangler
wrangler login                       # opens browser, authorise the Octolabs account

# 1. D1 database — wrangler.toml already references database_id
#    7220664c-4098-4dcf-8030-470443007e2f. If that ID does not exist in your
#    account, create a fresh one and update wrangler.toml:
wrangler d1 create reservly-db

# 2. KV namespace — same: wrangler.toml references
#    bfaeb12444044848bb6b60a09e112953. Verify or recreate:
wrangler kv namespace create reservly-sessions

# 3. Apply BOTH migrations (order matters):
wrangler d1 execute reservly-db --remote --file=migrations/0001_reservly_core.sql
wrangler d1 execute reservly-db --remote --file=migrations/0002_booking_rules.sql

# 4. Create the Pages project and deploy:
npm run build
wrangler pages deploy ./dist --project-name=reservly

# 5. Secrets (Pages → Settings → Environment variables, or:)
wrangler pages secret put SESSION_SECRET --project-name=reservly
wrangler pages secret put TWILIO_ACCOUNT_SID --project-name=reservly
wrangler pages secret put TWILIO_AUTH_TOKEN --project-name=reservly
wrangler pages secret put TWILIO_WHATSAPP_FROM --project-name=reservly
wrangler pages secret put STRIPE_SECRET_KEY --project-name=reservly
wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name=reservly
wrangler pages secret put STRIPE_PRICE_PRO_MONTHLY --project-name=reservly
wrangler pages secret put STRIPE_PRICE_STUDIO_MONTHLY --project-name=reservly
```

Twilio and Stripe secrets are **optional at launch** — without them the app
runs in log-only messaging mode and shows a clean "upgrades almost ready"
message instead of Stripe checkout.

## Custom domain (hides pages.dev from users)

1. Cloudflare dashboard → Pages → reservly → **Custom domains** →
   Add `reservly.octolabs.app`. Since `octolabs.app` is already on Cloudflare,
   the CNAME is created automatically.
2. Build-time env var (Pages → Settings → Environment variables, Production):
   - `VITE_SITE_URL=https://reservly.octolabs.app`
   - `SITE_URL=https://reservly.octolabs.app` (also in `wrangler.toml` [vars])
3. Re-deploy after setting build vars (VITE_ vars are baked at build time).

**What can and cannot be hidden:**

- `reservly.pages.dev` always exists — Cloudflare does not allow deleting the
  default Pages subdomain. That is fine: it is never shown to users.
- Everything customer-facing (dashboard share links, WhatsApp messages,
  booking confirmations, metadata) is generated from `SITE_URL` /
  `VITE_SITE_URL`, so with the vars above users only ever see
  `reservly.octolabs.app`.
- Optionally, add a Bulk Redirect in Cloudflare from
  `reservly.pages.dev/*` → `https://reservly.octolabs.app/$1` so even direct
  visits land on the real domain.

## Webhooks (after the domain is live)

- Twilio WhatsApp inbound: `https://reservly.octolabs.app/api/twilio/inbound`
- Stripe webhook: `https://reservly.octolabs.app/api/stripe/webhook`

## Manual checks after deploy

- Create an owner account (sign-up happens before onboarding step 1).
- Complete onboarding; open the public booking link.
- Create a booking; confirm the dashboard shows it.
- Cancel and confirm bookings from /dashboard/bookings.
- Verify Free plan usage reads `15/15 bookings used` when full.
- Verify Settings → Booking rules (minimum notice, advance window, slot
  interval) change the public slot grid.
- Test with Twilio env vars missing first; messages should log, not crash.
- Test Stripe with env vars missing; checkout shows the coming-soon message.
