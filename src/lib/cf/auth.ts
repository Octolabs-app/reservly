// src/lib/cf/auth.ts
// Owner authentication backed by D1 + KV.
// Replaces: src/lib/rezavu/auth.ts (Supabase GoTrue)
//
// Strategy:
//   - Passwords stored as bcryptjs hashes in owners.password_hash
//   - Sessions stored in D1 sessions table (source of truth)
//   - KV used as a TTL cache: key = "session:{id}" → owner JSON
//   - Session token sent/read as an HttpOnly cookie "rsv_session"
//   - In local dev (no D1 binding) falls back to the existing dev-store owner

import { getD1, getKV, d1First, d1Run, isD1Enabled } from "./db";
import { getDevOwner } from "@/lib/randevou/dev-store";
import type { Owner } from "@/lib/randevou/types";

const SESSION_COOKIE = "rzv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const KV_TTL_SECONDS = 60 * 60; // 1 hour KV cache

type SessionRow = { id: string; owner_id: string; expires_at: string };
type OwnerRow = { id: string; email: string; full_name: string | null; password_hash: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

// ─── Cookie utilities (server-side, called from server handlers) ──────────────

export function buildSessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSessionIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

// ─── Session resolution ───────────────────────────────────────────────────────

/**
 * Resolve a session token to an Owner.
 * Checks KV first (fast path), then D1.
 */
export async function resolveSession(sessionId: string): Promise<Owner | null> {
  const kv = getKV();

  // KV fast path
  if (kv) {
    const cached = await kv.get<Owner>(`session:${sessionId}`, { type: "json" });
    if (cached) return cached;
  }

  const db = getD1();
  if (!db) return null;

  const session = await d1First<SessionRow>(
    db.prepare("SELECT id, owner_id, expires_at FROM sessions WHERE id = ?").bind(sessionId),
  );
  if (!session || isExpired(session.expires_at)) return null;

  const ownerRow = await d1First<OwnerRow>(
    db.prepare("SELECT id, email, full_name FROM owners WHERE id = ?").bind(session.owner_id),
  );
  if (!ownerRow) return null;

  const owner: Owner = {
    id: ownerRow.id,
    email: ownerRow.email,
    name: ownerRow.full_name ?? ownerRow.email,
  };

  // Backfill KV cache
  if (kv) {
    const remaining = Math.max(
      0,
      Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000),
    );
    await kv.put(`session:${sessionId}`, JSON.stringify(owner), {
      expirationTtl: Math.min(remaining, KV_TTL_SECONDS),
    });
  }

  return owner;
}

// ─── Public auth functions (called from client-facing routes) ─────────────────

/**
 * Get the current owner from the request cookie.
 * In dev mode (no D1) returns the dev-store owner.
 */
export async function getCurrentOwner(request?: Request): Promise<Owner | null> {
  const cookieHeader = request?.headers.get("cookie") ?? null;

  // Browser context: read from document.cookie via a client-side fetch to /api/auth/me
  // For SSR / server handlers: pass the request object
  if (!request && typeof document !== "undefined") {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<Owner | null>;
    } catch {
      return null;
    }
  }

  if (!isD1Enabled()) return getDevOwner();

  const sessionId = getSessionIdFromCookieHeader(cookieHeader);
  if (!sessionId) return null;
  return resolveSession(sessionId);
}

/**
 * Sign in and return { owner, sessionCookie } on success.
 * In dev mode returns the dev owner without touching D1.
 */
export async function signInOwner(
  email: string,
  password: string,
): Promise<{ owner: Owner; sessionCookie: string }> {
  if (!isD1Enabled()) {
    const owner = await getDevOwner();
    return { owner, sessionCookie: buildSessionCookie("dev-session") };
  }

  const db = getD1()!;
  // bcrypt silently truncates at 72 UTF-8 bytes — reject here so two passwords
  // that differ only past byte 72 can never match the same hash.
  if (new TextEncoder().encode(password).length > 72) {
    throw new Error("Invalid email or password.");
  }
  const ownerRow = await d1First<OwnerRow>(
    db
      .prepare("SELECT id, email, full_name, password_hash FROM owners WHERE email = ?")
      .bind(email.trim().toLowerCase()),
  );
  if (!ownerRow) throw new Error("Invalid email or password.");

  const valid = await verifyPassword(password, ownerRow.password_hash);
  if (!valid) throw new Error("Invalid email or password.");

  const sessionId = crypto.randomUUID();
  await d1Run(
    db
      .prepare("INSERT INTO sessions (id, owner_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, ownerRow.id, sessionExpiresAt()),
  );

  const owner: Owner = {
    id: ownerRow.id,
    email: ownerRow.email,
    name: ownerRow.full_name ?? ownerRow.email,
  };
  return { owner, sessionCookie: buildSessionCookie(sessionId) };
}

/**
 * Sign up, create owner row, create session.
 */
export async function signUpOwner(
  email: string,
  password: string,
  fullName?: string,
): Promise<{ owner: Owner; sessionCookie: string }> {
  if (!isD1Enabled()) {
    const owner = await getDevOwner();
    return { owner, sessionCookie: buildSessionCookie("dev-session") };
  }

  const db = getD1()!;
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName?.trim() || null;
  const existing = await d1First<{ id: string }>(
    db.prepare("SELECT id FROM owners WHERE email = ?").bind(cleanEmail),
  );
  if (existing) throw new Error("An account with that email already exists.");

  const hash = await hashPassword(password);
  const ownerId = crypto.randomUUID();
  await d1Run(
    db
      .prepare("INSERT INTO owners (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)")
      .bind(ownerId, cleanEmail, hash, cleanName),
  );

  const sessionId = crypto.randomUUID();
  await d1Run(
    db
      .prepare("INSERT INTO sessions (id, owner_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, ownerId, sessionExpiresAt()),
  );

  const owner: Owner = { id: ownerId, email: cleanEmail, name: cleanName ?? cleanEmail };
  return { owner, sessionCookie: buildSessionCookie(sessionId) };
}

/**
 * Permanently delete an owner and (via D1 FK cascades) their businesses,
 * services, availability, bookings and subscriptions.
 */
export async function deleteOwnerAccount(ownerId: string, sessionId: string | null) {
  if (!isD1Enabled()) return clearSessionCookie();

  const db = getD1()!;
  const kv = getKV();
  await d1Run(db.prepare("DELETE FROM owners WHERE id = ?").bind(ownerId));
  if (sessionId && kv) await kv.delete(`session:${sessionId}`);
  return clearSessionCookie();
}

/**
 * Returns the Set-Cookie header to clear the session.
 */
export async function signOutOwner(sessionId: string): Promise<string> {
  if (!isD1Enabled()) return clearSessionCookie();

  const db = getD1()!;
  const kv = getKV();

  await d1Run(db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId));

  if (kv) await kv.delete(`session:${sessionId}`);

  return clearSessionCookie();
}

export function authModeLabel(): string {
  return isD1Enabled() ? "Cloudflare D1 Auth" : "Local dev mode";
}
