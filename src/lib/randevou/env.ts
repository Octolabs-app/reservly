// src/lib/rezavu/env.ts
// Public client-side environment variables (VITE_ prefix = shipped to browser).
// Supabase vars removed — auth and data now backed by Cloudflare D1 + Workers.

type ViteEnv = Record<string, string | boolean | undefined>;

function readEnv(name: string) {
  const env = import.meta.env as ViteEnv;
  const value = env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getClientEnv() {
  return {
    siteUrl:
      readEnv("VITE_SITE_URL") ??
      readEnv("SITE_URL") ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"),
  };
}

export function getSiteUrl() {
  return getClientEnv().siteUrl.replace(/\/$/, "");
}
