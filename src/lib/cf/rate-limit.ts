// Lightweight KV-backed rate limiter for abuse-prone endpoints.
// KV is eventually consistent, so this is a soft limit — good enough to stop
// naive brute force and booking spam; pair with Cloudflare WAF rules for more.

import { getKV } from "./db";

/**
 * Returns true when the call is allowed, false when the limit is exceeded.
 * Window resets `windowSeconds` after the most recent allowed call
 * (KV minimum TTL is 60s — use windows of at least that).
 */
export async function allowRequest(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const kv = getKV();
  if (!kv) return true; // local dev — no limiter

  const kvKey = `rl:${bucket}:${key}`;
  const current = Number((await kv.get(kvKey)) ?? "0");
  if (current >= limit) return false;

  await kv.put(kvKey, String(current + 1), {
    expirationTtl: Math.max(60, windowSeconds),
  });
  return true;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
