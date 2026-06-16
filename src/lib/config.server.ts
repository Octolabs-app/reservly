import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.

export function getServerConfig() {
  // NOTE: On Cloudflare Workers, secrets are injected via the CF env binding
  // (see src/lib/cf/db.ts getCFEnv()) — not process.env.
  // process.env is kept here only for local Vite dev fallback and legacy callers.
  return {
    nodeEnv: process.env.NODE_ENV,
    // Meta Cloud API (WhatsApp)
    metaWaToken: process.env.META_WA_TOKEN,
    metaWaPhoneId: process.env.META_WA_PHONE_ID,
    metaWaVerifyToken: process.env.META_WA_VERIFY_TOKEN,
    // Meta App (Facebook Login + webhook validation)
    metaAppId: process.env.META_APP_ID,
    metaAppSecret: process.env.META_APP_SECRET,
    // Google OAuth
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    siteUrl: process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "http://localhost:5173",
  };
}
