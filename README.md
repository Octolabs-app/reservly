# Randevou

Randevou by Octolabs — WhatsApp-native booking for island businesses
(salons, barbers, beauty, wellness, tutors) in Mauritius, Réunion and
Seychelles. Customers tap a link, pick a slot, and get a WhatsApp
confirmation with a booking reference. No app, no account.

> Renamed Reservly → Rezavu → **Randevou** (earlier names collided with
> existing products). Short mark: **RDVU** (a mark, never the product name).
> Internal module paths under `src/lib/randevou` / `src/components/randevou`.

## Stack

- **Framework:** TanStack Start (TanStack Router + React 19 + Vite + Nitro)
- **Styling:** Tailwind CSS 4, light "island" design system (lagoon blue
  `#1B4FD8`, coral `#E8593C`), components in `src/components/randevou/`
- **Hosting:** Cloudflare Pages (only supported target — `vite.config.ts`
  uses the `cloudflare_pages` preset; build emits `dist/_worker.js`)
- **Database:** Cloudflare D1 (SQLite) — schema in `migrations/`
- **Sessions:** Cloudflare KV cache + D1 `sessions` table, bcryptjs passwords
- **Messaging:** Twilio WhatsApp via plain REST (no SDK); logs to D1 when unset
- **Billing:** no-BRN-friendly provider abstraction (`src/lib/cf/subscriptions.ts`)
  — see below. Free plan = 15 bookings/month, enforced in `src/lib/cf/data.ts`
- **Package manager:** npm (single lockfile: `package-lock.json`)

## Local development

```bash
npm ci
npm run dev
```

No environment variables or database needed: without D1 bindings the app runs
against an in-browser dev store seeded with a demo business (`/b/salon-rose`).
In dev mode `/admin` is reachable by the local owner; in production it is gated
by `ADMIN_EMAILS`. See `ENVIRONMENT_VARIABLES.md` for the production surface.

Checks:

```bash
npm run typecheck
npm run build
npm run lint
```

## Scheduling controls (per business, in Settings)

- **Service duration:** 15 / 30 / 45 / 60 min, 2h+, **custom minutes**, or
  **whole-day** service (one booking blocks the working day).
- **Minimum notice:** hours or days before a slot can be booked.
- **No same-day booking** toggle.
- **How far ahead** customers can book (no hardcoded 30-day cap; honored by the
  public page up to a 365-day ceiling).
- **Slot interval:** 15/20/30/45/60 min.

Slots are generated server-side and the public booking API **rejects any start
time that is not a currently-available generated slot** — client date/time
choices are never trusted.

## WhatsApp cancellation

Confirmations include a booking reference (e.g. `RDV-8K2Q`). Customers can
reply `/cancel`, `/cancel RDV-8K2Q`, `cancel RDV-8K2Q`, or `annuler RDV-8K2Q`.
With one active booking, `/cancel` cancels it; with several, Randevou lists the
references and asks which — it never cancels multiple bookings by guessing.
Inbound webhooks are signature-verified.

## Platform admin (`/admin`)

Separate from the owner `/dashboard`. Gated by `ADMIN_EMAILS` (comma-separated
owner emails); every `/api/admin/*` route enforces it server-side and
non-admins get 403. Sections: Overview, Businesses, Owners, Bookings, Billing,
Messaging, System, Audit Log. Every admin mutation is written to
`admin_audit_events`. Customer phone numbers are masked; secret values are
never shown.

## No-BRN billing

The founder has no BRN, so **no business-registration number is required
anywhere**. Randevou bills business owners for their SaaS subscription only (no
customer→business appointment payments). Providers, in order of preference:

1. **Paddle** (Individual / Sole Trader) — primary, when approved
2. **Dodo Payments** (individual / unregistered) — backup
3. **PayPal manual** — admin marks an owner paid (`provider = paypal_manual`)
4. **manual** — any other arrangement, tracked by admin
5. **Stripe** — future only, never auto-selected, not required

Subscription states: `free | trialing | active | past_due | canceled | manual`.
No automated billing is claimed live until a provider's credentials are set;
until then owner "Upgrade" shows manual-arrangement messaging.

## Routes

Pages: `/`, `/auth`, `/onboarding`, `/b/$slug`, `/b/$slug/confirmed`,
`/dashboard`, `/dashboard/bookings`, `/dashboard/settings`, `/admin`,
`/privacy`, `/terms`

API: `/api/auth/{signup,signin,signout,me,delete-account}`,
`/api/dashboard/{data,business,service,availability,booking-action,create-booking}`,
`/api/public/{business,slots,bookings,booking}`,
`/api/admin/{overview,businesses,owners,bookings,messaging,system,audit}`,
`/api/twilio/inbound`. (`/api/stripe/*` remain as future-only legacy.)

## Deployment

Cloudflare Pages + D1 + KV. Authoritative runbook: **[DEPLOYMENT.md](DEPLOYMENT.md)**
(architecture background in `CLOUDFLARE_SETUP.md`). Apply migrations
0001 + 0002 + 0003 in order before serving traffic.

## Docs

- `DEPLOYMENT.md` — deploy runbook + truthful status (start here)
- `ENVIRONMENT_VARIABLES.md` — the real env/secret surface (incl. ADMIN_EMAILS,
  Paddle/Dodo/PayPal)
- `CLOUDFLARE_SETUP.md` — architecture and Cloudflare resource notes
- `TWILIO_SETUP.md` — WhatsApp provider configuration
- `docs/LOGO_DESIGN_BRIEF.md` — brief for the final logo (current mark is a
  placeholder, not the approved brand)
- `POST_LAUNCH_BACKLOG.md` — deferred improvements
