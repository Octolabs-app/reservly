# Environment Variables

Never commit real secrets. Locally, **nothing is required** (the in-browser dev
store runs without credentials). In production, set non-secret vars in
`wrangler.toml` `[vars]` / the Cloudflare Pages dashboard, and secrets via
`wrangler pages secret put <NAME> --project-name=randevou`.

## Server (Cloudflare Pages bindings + vars)

| Variable               | Required   | Purpose                                                                                                                                       |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB` (D1 binding)      | yes        | Cloudflare D1 database (`randevou-db`).                                                                                                       |
| `KV` (KV binding)      | yes        | Session cache + rate-limit counters (`randevou-sessions`).                                                                                    |
| `SITE_URL`             | yes        | Public site URL, no trailing slash (`https://randevou.octolabs.app`). Used in WhatsApp links, booking links, and Twilio signature validation. |
| `ADMIN_EMAILS`         | for /admin | Comma-separated owner emails allowed into the platform admin (`/admin`). Empty = nobody can access admin in production.                       |
| `TWILIO_ACCOUNT_SID`   | no\*       | Twilio account SID.                                                                                                                           |
| `TWILIO_AUTH_TOKEN`    | no\*       | Twilio auth token — also validates inbound webhook signatures.                                                                                |
| `TWILIO_WHATSAPP_FROM` | no\*       | WhatsApp sender, e.g. `whatsapp:+14155238886`.                                                                                                |

\* Optional at launch: without Twilio vars, outbound messages are logged to the
D1 `message_events` table instead of being sent, and the app still works.

## Billing (no-BRN-friendly — no BRN / company registration required)

Billing is for the **business owner's SaaS subscription only**. Randevou never
processes customer→business appointment payments. Set up **one** automated
provider when approved; until then upgrades are handled manually by an admin.

**Paddle — primary (Individual / Sole Trader):**

| Variable                | Purpose                        |
| ----------------------- | ------------------------------ |
| `PADDLE_API_KEY`        | Paddle API key.                |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook signing secret. |
| `PADDLE_ENVIRONMENT`    | `sandbox` or `production`.     |
| `PADDLE_PRICE_PRO`      | Paddle price ID for Pro.       |
| `PADDLE_PRICE_STUDIO`   | Paddle price ID for Studio.    |

**Dodo Payments — backup (individual / unregistered business):**

| Variable              | Purpose                      |
| --------------------- | ---------------------------- |
| `DODO_API_KEY`        | Dodo API key.                |
| `DODO_WEBHOOK_SECRET` | Dodo webhook signing secret. |
| `DODO_ENVIRONMENT`    | `test` or `live`.            |
| `DODO_PRICE_PRO`      | Dodo price ID for Pro.       |
| `DODO_PRICE_STUDIO`   | Dodo price ID for Studio.    |

**PayPal manual fallback:** no env vars. An admin marks an owner paid in
`/admin → Businesses → Mark paid` (stored as `provider = paypal_manual`).

**Stripe — future only (do not configure now):** `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_STUDIO_MONTHLY`.
Used only if Octolabs later has a supported legal/business setup. The app does
not require or auto-select Stripe.

The admin **System** tab shows which providers are configured (yes/no) without
revealing any secret values.

## Build-time (Vite, baked into the client bundle)

| Variable        | Purpose                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SITE_URL` | Public URL the client renders in share links and the booking-link panel. Set it in the Pages build environment, then redeploy. |

There are no Supabase variables (the Supabase backend was fully replaced by
Cloudflare D1/KV) and no `SESSION_SECRET` (sessions are random UUIDs stored
server-side; nothing is signed).
