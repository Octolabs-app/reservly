# Rezavu

Rezavu by Octolabs — WhatsApp-native booking for island businesses
(salons, barbers, beauty, wellness, tutors) in Mauritius, Réunion and
Seychelles. Customers tap a link, pick a slot, and get a WhatsApp
confirmation. No app, no account.

> The product was previously named "Reservly"; it was renamed because that
> name is used by an existing booking product.

## Stack

- **Framework:** TanStack Start (TanStack Router + React 19 + Vite + Nitro)
- **Styling:** Tailwind CSS 4, light "island" design system (lagoon blue
  `#1B4FD8`, coral `#E8593C`), components in `src/components/rezavu/`
- **Hosting:** Cloudflare Pages (the only supported target —
  `vite.config.ts` uses the `cloudflare_pages` preset)
- **Database:** Cloudflare D1 (SQLite) — schema in `migrations/`
- **Sessions:** Cloudflare KV cache + D1 `sessions` table, bcryptjs passwords
- **Messaging:** Twilio WhatsApp via plain REST (no SDK), log-only when unset
- **Billing:** Stripe subscriptions (Pro/Studio), free plan = 15 bookings/month
  enforced in the app layer (`src/lib/cf/data.ts`)
- **Package manager:** npm (single lockfile: `package-lock.json`)

## Local development

```bash
npm install
npm run dev
```

No environment variables or database needed: without D1 bindings the app
runs against an in-browser dev store seeded with a demo business
(`/b/salon-rose`). See `ENVIRONMENT_VARIABLES.md` for the production surface.

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Routes

Pages: `/`, `/auth`, `/onboarding`, `/b/$slug`, `/b/$slug/confirmed`,
`/dashboard`, `/dashboard/bookings`, `/dashboard/settings`, `/privacy`,
`/terms`

API: `/api/auth/{signup,signin,signout,me,delete-account}`,
`/api/dashboard/{data,business,service,availability,booking-action,create-booking}`,
`/api/public/{business,slots,bookings,booking}`,
`/api/stripe/{checkout,webhook}`, `/api/twilio/inbound`

## Deployment

Cloudflare Pages + D1 + KV. The authoritative runbook is
**[DEPLOYMENT.md](DEPLOYMENT.md)** (architecture background in
`CLOUDFLARE_SETUP.md`). Apply **both** migrations in order before serving
traffic.

## Docs

- `DEPLOYMENT.md` — deploy runbook (start here)
- `CLOUDFLARE_SETUP.md` — architecture and Cloudflare resource notes
- `ENVIRONMENT_VARIABLES.md` — the real env/secret surface
- `STRIPE_SETUP.md`, `TWILIO_SETUP.md` — provider configuration
- `docs/LOGO_DESIGN_BRIEF.md` — brief for the final logo (current mark is a
  placeholder)
- `POST_LAUNCH_BACKLOG.md` — deferred improvements
