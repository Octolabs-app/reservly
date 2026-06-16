// src/lib/cf/db.ts
// Cloudflare D1 database client.
// Replaces: src/lib/rezavu/supabase.ts + admin.server.ts
//
// On Cloudflare Workers, the D1 binding is passed per-request via the
// execution context. TanStack Start exposes it through the Nitro event's
// `context.cloudflare.env`. Outside Workers (local dev / Vite dev server)
// we fall back to the in-memory dev-store so the app stays fully runnable
// without any Cloudflare credentials.
//
// Usage in a server handler:
//   import { getDB } from "@/lib/cf/db";
//   const db = getDB(request);
//   const rows = await db.prepare("SELECT * FROM businesses WHERE owner_id = ?").bind(ownerId).all();

import { getServerConfig } from "@/lib/config.server";

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<D1ExecResult>;
  batch: (statements: D1PreparedStatement[]) => Promise<D1Result[]>;
  dump: () => Promise<ArrayBuffer>;
};

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>(colName?: string) => Promise<T | null>;
  run: () => Promise<D1Result>;
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>;
  raw: <T = unknown[]>() => Promise<T[]>;
};

export type D1Result<T = Record<string, unknown>> = {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
};

export type D1ExecResult = {
  count: number;
  duration: number;
};

// Cloudflare env bindings injected at request time via Nitro/Cloudflare Pages
export type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  SITE_URL?: string;
  // Platform admin gate (comma-separated owner emails)
  ADMIN_EMAILS?: string;
  // Auth — Google OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // Auth + Messaging — Meta (Facebook Login + WhatsApp Cloud API)
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  // WhatsApp Cloud API (send messages)
  META_WA_TOKEN?: string;
  META_WA_PHONE_ID?: string;
  META_WA_VERIFY_TOKEN?: string;
  // Billing — Paddle (primary, individual/sole-trader)
  PADDLE_API_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_ENVIRONMENT?: string;
  PADDLE_PRICE_PRO?: string;
  PADDLE_PRICE_STUDIO?: string;
  // Billing — Dodo Payments (backup, individual)
  DODO_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
  DODO_ENVIRONMENT?: string;
  DODO_PRICE_PRO?: string;
  DODO_PRICE_STUDIO?: string;
  // Billing — Stripe (future only)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_STUDIO_MONTHLY?: string;
  // Manual payment
  PAYPAL_ME_URL?: string;
};

export type KVNamespace = {
  get: <T = string>(
    key: string,
    options?: { type?: "text" | "json" | "arrayBuffer" | "stream" },
  ) => Promise<T | null>;
  put: (
    key: string,
    value: string | ArrayBuffer,
    options?: { expirationTtl?: number },
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: {
    prefix?: string;
    limit?: number;
  }) => Promise<{ keys: Array<{ name: string; expiration?: number }> }>;
};

// Module-level cache: populated once per Worker isolate from the Nitro context.
// On re-use within the same request chain this is a no-op.
let _d1: D1Database | null = null;
let _kv: KVNamespace | null = null;
let _cfEnv: CloudflareEnv | null = null;

/**
 * Called by server handlers to inject the CF bindings from the Nitro request context.
 * In TanStack Start, access via: event.context.cloudflare?.env
 */
export function initCFBindings(env: CloudflareEnv) {
  _d1 = env.DB ?? null;
  _kv = env.KV ?? null;
  _cfEnv = env;
}

/**
 * Resolve the Cloudflare bindings directly from the Workers runtime.
 *
 * In this Nitro `cloudflare_pages` + h3 v2 stack the bindings are NOT handed to
 * the server entry's `fetch(request, env, ctx)` (env arrives `undefined`), so we
 * read them from the `cloudflare:workers` virtual module, which exposes the
 * isolate-scoped `env` at module scope. The dynamic import only resolves inside
 * the Workers runtime; in local Vite/Node dev it throws and we silently keep the
 * in-browser dev-store fallback.
 */
async function resolveWorkersEnv(): Promise<void> {
  if (_cfEnv) return;
  try {
    // Non-literal specifier so the bundler does not try to resolve this
    // Workers-only module at build time (it only exists at runtime on CF).
    const spec = "cloudflare:" + "workers";
    const mod = (await import(/* @vite-ignore */ spec)) as {
      env?: CloudflareEnv;
    };
    if (mod?.env && typeof mod.env === "object" && mod.env.DB) {
      initCFBindings(mod.env);
    }
  } catch {
    // Not running on Cloudflare Workers — keep the dev-store fallback.
  }
}

// Resolve once per isolate at module load. Top-level await guarantees the
// bindings are populated before any handler that imports this module runs.
await resolveWorkersEnv();

export function getD1(): D1Database | null {
  return _d1;
}

export function getKV(): KVNamespace | null {
  return _kv;
}

export function getCFEnv(): CloudflareEnv | null {
  return _cfEnv;
}

export function isD1Enabled(): boolean {
  return _d1 !== null;
}

/**
 * Thin typed query helpers. Throw on D1 error so callers don't need to
 * manually check .success. Raw driver errors are logged server-side and
 * replaced with a generic message so SQL internals never reach clients.
 */
const GENERIC_DB_ERROR = "Something went wrong. Please try again.";

export async function d1All<T = Record<string, unknown>>(stmt: D1PreparedStatement): Promise<T[]> {
  let result: D1Result<T>;
  try {
    result = await stmt.all<T>();
  } catch (error) {
    console.error("[d1All]", error);
    throw new Error(GENERIC_DB_ERROR);
  }
  if (!result.success) {
    console.error("[d1All]", result.error);
    throw new Error(GENERIC_DB_ERROR);
  }
  return result.results;
}

export async function d1First<T = Record<string, unknown>>(
  stmt: D1PreparedStatement,
): Promise<T | null> {
  try {
    return await stmt.first<T>();
  } catch (error) {
    console.error("[d1First]", error);
    throw new Error(GENERIC_DB_ERROR);
  }
}

export async function d1Run(stmt: D1PreparedStatement): Promise<void> {
  let result: D1Result;
  try {
    result = await stmt.run();
  } catch (error) {
    console.error("[d1Run]", error);
    throw new Error(GENERIC_DB_ERROR);
  }
  if (!result.success) {
    console.error("[d1Run]", result.error);
    throw new Error(GENERIC_DB_ERROR);
  }
}
