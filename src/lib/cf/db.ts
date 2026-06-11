// src/lib/cf/db.ts
// Cloudflare D1 database client.
// Replaces: src/lib/reservly/supabase.ts + admin.server.ts
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
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_STUDIO_MONTHLY?: string;
  SITE_URL?: string;
  SESSION_SECRET?: string;
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
 * Thin typed query helper. Throws on D1 error so callers don't need to
 * manually check .success.
 */
export async function d1All<T = Record<string, unknown>>(stmt: D1PreparedStatement): Promise<T[]> {
  const result = await stmt.all<T>();
  if (!result.success) throw new Error(result.error ?? "D1 query failed");
  return result.results;
}

export async function d1First<T = Record<string, unknown>>(
  stmt: D1PreparedStatement,
): Promise<T | null> {
  return stmt.first<T>();
}

export async function d1Run(stmt: D1PreparedStatement): Promise<void> {
  const result = await stmt.run();
  if (!result.success) throw new Error(result.error ?? "D1 mutation failed");
}
