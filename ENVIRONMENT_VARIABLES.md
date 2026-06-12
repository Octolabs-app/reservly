# Environment Variables

Never commit real secrets. Locally, nothing is required (the dev store runs
without credentials). In production, set non-secret vars in `wrangler.toml`
`[vars]` / the Pages dashboard, and secrets via
`wrangler pages secret put <NAME> --project-name=rezavu`.

## Server (Cloudflare Pages bindings + vars)

| Variable                      | Required | Purpose                                                       |
| ----------------------------- | -------- | ------------------------------------------------------------- |
| `DB` (D1 binding)             | yes      | Cloudflare D1 database (`rezavu-db`).                          |
| `KV` (KV binding)             | yes      | Session cache + rate-limit counters (`rezavu-sessions`).       |
| `SITE_URL`                    | yes      | Public site URL, no trailing slash (`https://rezavu.octolabs.app`). Used in WhatsApp links, Stripe redirects, Twilio signature validation. |
| `TWILIO_ACCOUNT_SID`          | no\*     | Twilio account SID.                                            |
| `TWILIO_AUTH_TOKEN`           | no\*     | Twilio auth token — also validates inbound webhook signatures. |
| `TWILIO_WHATSAPP_FROM`        | no\*     | WhatsApp sender, e.g. `whatsapp:+14155238886`.                 |
| `STRIPE_SECRET_KEY`           | no\*     | Stripe secret key.                                             |
| `STRIPE_WEBHOOK_SECRET`       | no\*     | Stripe webhook signing secret.                                 |
| `STRIPE_PRICE_PRO_MONTHLY`    | no\*     | Stripe recurring price ID for Pro.                             |
| `STRIPE_PRICE_STUDIO_MONTHLY` | no\*     | Stripe recurring price ID for Studio.                          |

\* Optional at launch: without Twilio vars, messages are logged instead of
sent; without Stripe vars, upgrade buttons show a clean "coming soon" notice.

## Build-time (Vite, baked into the client bundle)

| Variable        | Purpose                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `VITE_SITE_URL` | Public URL the client renders in share links and the booking-link panel. Set it in the Pages build environment, then redeploy. |

There are no Supabase variables — the Supabase backend was fully replaced by
Cloudflare D1/KV. There is no `SESSION_SECRET` — sessions are random UUIDs
stored server-side, nothing is signed.
