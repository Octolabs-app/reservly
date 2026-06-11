# Environment Variables

Never commit real secrets. Use `.env.local` locally and your deployment provider's secret storage in production.

## Required

| Variable                      | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`                | Supabase project URL for server-side code.                   |
| `SUPABASE_ANON_KEY`           | Supabase publishable or legacy anon key.                     |
| `SUPABASE_SERVICE_ROLE_KEY`   | Server-only Supabase secret/service role key.                |
| `TWILIO_ACCOUNT_SID`          | Twilio account SID.                                          |
| `TWILIO_AUTH_TOKEN`           | Twilio auth token.                                           |
| `TWILIO_WHATSAPP_FROM`        | Twilio WhatsApp sender, for example `whatsapp:+14155238886`. |
| `STRIPE_SECRET_KEY`           | Stripe secret key.                                           |
| `STRIPE_WEBHOOK_SECRET`       | Stripe webhook signing secret.                               |
| `STRIPE_PRICE_PRO_MONTHLY`    | Stripe recurring price ID for Pro.                           |
| `STRIPE_PRICE_STUDIO_MONTHLY` | Stripe recurring price ID for Studio.                        |
| `SITE_URL`                    | Public site URL, without a trailing slash.                   |

## Vite Client Aliases

The browser Supabase client also reads:

| Variable                 | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase URL exposed to the client.         |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key exposed to the client. |
| `VITE_SITE_URL`          | Public URL exposed to the client.           |

Supabase's current key model prefers publishable keys for client-side use and secret keys for trusted backends.
