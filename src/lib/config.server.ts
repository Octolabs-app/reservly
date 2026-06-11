import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  // NOTE: On Cloudflare Workers, secrets are injected via the CF env binding
  // (see src/lib/cf/db.ts getCFEnv()) — not process.env.
  // process.env is kept here only for local Vite dev fallback and legacy callers.
  // All new CF server code should call getCFEnv() from src/lib/cf/db.ts instead.
  return {
    nodeEnv: process.env.NODE_ENV,
    // Supabase vars intentionally removed — see migration guide in CLOUDFLARE_SETUP.md
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceStudioMonthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    siteUrl: process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "http://localhost:5173",
  };
}
