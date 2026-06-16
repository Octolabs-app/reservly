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
const DISABLED_PASSWORD_HASH = "google:disabled";
export const MAX_BCRYPT_PASSWORD_BYTES = 72;

type SessionRow = { id: string; owner_id: string; expires_at: string };
type OwnerRow = {
  id: string;
  email: string;
  full_name: string | null;
  password_hash?: string | null;
  google_sub?: string | null;
  google_email?: string | null;
  facebook_id?: string | null;
  facebook_email?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function passwordLengthError(password: string): string | null {
  if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES) {
    return "Password is too long. Use 72 bytes or fewer.";
  }
  return null;
}

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith("$2")) return false;
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function mapOwner(row: OwnerRow): Owner {
  return {
    id: row.id,
    email: row.email,
    name: row.full_name ?? row.email,
    googleLinked: Boolean(row.google_sub),
    googleEmail: row.google_email ?? null,
    facebookLinked: Boolean(row.facebook_id),
    facebookEmail: row.facebook_email ?? null,
    passwordLoginEnabled: Boolean(
      row.password_hash && row.password_hash !== DISABLED_PASSWORD_HASH,
    ),
  };
}

async function createOwnerSession(owner: Owner): Promise<string> {
  const db = getD1();
  if (!db) return buildSessionCookie("dev-session");

  const sessionId = crypto.randomUUID();
  await d1Run(
    db
      .prepare("INSERT INTO sessions (id, owner_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, owner.id, sessionExpiresAt()),
  );
  return buildSessionCookie(sessionId);
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
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
      )
      .bind(session.owner_id),
  );
  if (!ownerRow) return null;

  const owner = mapOwner(ownerRow);

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
  const lengthError = passwordLengthError(password);
  if (lengthError) throw new Error(lengthError);

  const db = getD1()!;
  // bcrypt silently truncates at 72 UTF-8 bytes — reject here so two passwords
  // that differ only past byte 72 can never match the same hash.
  if (new TextEncoder().encode(password).length > 72) {
    throw new Error("Invalid email or password.");
  }
  const ownerRow = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE email = ?",
      )
      .bind(email.trim().toLowerCase()),
  );
  if (!ownerRow) throw new Error("Invalid email or password.");
  if (!ownerRow.password_hash) throw new Error("Invalid email or password.");

  const valid = await verifyPassword(password, ownerRow.password_hash);
  if (!valid) throw new Error("Invalid email or password.");

  const owner = mapOwner(ownerRow);
  return { owner, sessionCookie: await createOwnerSession(owner) };
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
  const lengthError = passwordLengthError(password);
  if (lengthError) throw new Error(lengthError);
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

  const owner: Owner = {
    id: ownerId,
    email: cleanEmail,
    name: cleanName ?? cleanEmail,
    googleLinked: false,
    googleEmail: null,
    passwordLoginEnabled: true,
  };
  return { owner, sessionCookie: await createOwnerSession(owner) };
}

export async function signInOrLinkGoogleOwner(input: {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
  linkOwnerId?: string | null;
}): Promise<{ owner: Owner; sessionCookie: string }> {
  if (!isD1Enabled()) throw new Error("Google sign-in is unavailable in local dev mode.");
  if (!input.emailVerified) throw new Error("Google email must be verified.");

  const db = getD1()!;
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name?.trim() || cleanEmail;

  const ownerByGoogle = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE google_sub = ?",
      )
      .bind(input.googleSub),
  );

  if (ownerByGoogle) {
    const owner = mapOwner(ownerByGoogle);
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  if (input.linkOwnerId) {
    const linkedElsewhere = await d1First<{ id: string }>(
      db.prepare("SELECT id FROM owners WHERE google_sub = ?").bind(input.googleSub),
    );
    if (linkedElsewhere && linkedElsewhere.id !== input.linkOwnerId) {
      throw new Error("That Google account is already connected to another owner.");
    }
    await d1Run(
      db
        .prepare(
          `UPDATE owners SET
             google_sub = ?, google_email = ?, google_name = ?, google_picture_url = ?,
             google_linked_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(input.googleSub, cleanEmail, cleanName, input.picture ?? null, input.linkOwnerId),
    );
    const row = await d1First<OwnerRow>(
      db
        .prepare(
          "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
        )
        .bind(input.linkOwnerId),
    );
    if (!row) throw new Error("Owner not found.");
    const owner = mapOwner(row);
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  const ownerByEmail = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE email = ?",
      )
      .bind(cleanEmail),
  );
  if (ownerByEmail) {
    await d1Run(
      db
        .prepare(
          `UPDATE owners SET
             google_sub = ?, google_email = ?, google_name = ?, google_picture_url = ?,
             google_linked_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(input.googleSub, cleanEmail, cleanName, input.picture ?? null, ownerByEmail.id),
    );
    const owner = mapOwner({
      ...ownerByEmail,
      google_sub: input.googleSub,
      google_email: cleanEmail,
    });
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  const ownerId = crypto.randomUUID();
  await d1Run(
    db
      .prepare(
        `INSERT INTO owners
           (id, email, password_hash, full_name, google_sub, google_email, google_name,
            google_picture_url, google_linked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        ownerId,
        cleanEmail,
        DISABLED_PASSWORD_HASH,
        cleanName,
        input.googleSub,
        cleanEmail,
        cleanName,
        input.picture ?? null,
      ),
  );

  const owner: Owner = {
    id: ownerId,
    email: cleanEmail,
    name: cleanName,
    googleLinked: true,
    googleEmail: cleanEmail,
    passwordLoginEnabled: false,
  };
  return { owner, sessionCookie: await createOwnerSession(owner) };
}

export async function disconnectGoogleOwner(ownerId: string): Promise<Owner> {
  if (!isD1Enabled()) throw new Error("Google account linking is unavailable in local dev mode.");
  const db = getD1()!;
  const row = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
      )
      .bind(ownerId),
  );
  if (!row) throw new Error("Owner not found.");
  if (!row.google_sub) return mapOwner(row);
  if (!row.password_hash || row.password_hash === DISABLED_PASSWORD_HASH) {
    throw new Error("Add an email/password login before disconnecting Google.");
  }
  await d1Run(
    db
      .prepare(
        `UPDATE owners SET
           google_sub = NULL, google_email = NULL, google_name = NULL,
           google_picture_url = NULL, google_linked_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(ownerId),
  );
  return mapOwner({ ...row, google_sub: null, google_email: null });
}

/**
 * Set (or replace) the password for an owner.
 * Safe to call for Google-only owners: clears the `google:disabled` sentinel.
 */
export async function setPasswordOwner(ownerId: string, newPassword: string): Promise<Owner> {
  if (!isD1Enabled()) throw new Error("Password management is unavailable in local dev mode.");
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  const lengthError = passwordLengthError(newPassword);
  if (lengthError) throw new Error(lengthError);
  const db = getD1()!;
  const hash = await hashPassword(newPassword);
  await d1Run(
    db
      .prepare(
        "UPDATE owners SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(hash, ownerId),
  );
  const row = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
      )
      .bind(ownerId),
  );
  if (!row) throw new Error("Owner not found.");
  return mapOwner(row);
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

// ─── Facebook OAuth ───────────────────────────────────────────────────────────

export async function signInOrLinkFacebookOwner(input: {
  facebookId: string;
  email: string;
  name?: string | null;
  linkOwnerId?: string | null;
}): Promise<{ owner: Owner; sessionCookie: string }> {
  if (!isD1Enabled()) throw new Error("Facebook sign-in is unavailable in local dev mode.");

  const db = getD1()!;
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.name?.trim() || cleanEmail;

  // Already linked to this Facebook ID → just sign in.
  const ownerByFacebook = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE facebook_id = ?",
      )
      .bind(input.facebookId),
  );
  if (ownerByFacebook) {
    const owner = mapOwner(ownerByFacebook);
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  // Linking mode: attach to an existing signed-in owner.
  if (input.linkOwnerId) {
    const linkedElsewhere = await d1First<{ id: string }>(
      db.prepare("SELECT id FROM owners WHERE facebook_id = ?").bind(input.facebookId),
    );
    if (linkedElsewhere && linkedElsewhere.id !== input.linkOwnerId) {
      throw new Error("That Facebook account is already connected to another owner.");
    }
    await d1Run(
      db
        .prepare(
          `UPDATE owners SET
             facebook_id = ?, facebook_email = ?, facebook_name = ?,
             facebook_linked_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(input.facebookId, cleanEmail, cleanName, input.linkOwnerId),
    );
    const row = await d1First<OwnerRow>(
      db
        .prepare(
          "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
        )
        .bind(input.linkOwnerId),
    );
    if (!row) throw new Error("Owner not found.");
    const owner = mapOwner(row);
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  // Email match → link Facebook to the existing account automatically.
  const ownerByEmail = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE email = ?",
      )
      .bind(cleanEmail),
  );
  if (ownerByEmail) {
    await d1Run(
      db
        .prepare(
          `UPDATE owners SET
             facebook_id = ?, facebook_email = ?, facebook_name = ?,
             facebook_linked_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(input.facebookId, cleanEmail, cleanName, ownerByEmail.id),
    );
    const owner = mapOwner({
      ...ownerByEmail,
      facebook_id: input.facebookId,
      facebook_email: cleanEmail,
    });
    return { owner, sessionCookie: await createOwnerSession(owner) };
  }

  // New owner — create account via Facebook.
  const ownerId = crypto.randomUUID();
  await d1Run(
    db
      .prepare(
        `INSERT INTO owners
           (id, email, password_hash, full_name, facebook_id, facebook_email, facebook_name,
            facebook_linked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        ownerId,
        cleanEmail,
        DISABLED_PASSWORD_HASH,
        cleanName,
        input.facebookId,
        cleanEmail,
        cleanName,
      ),
  );

  const owner: Owner = {
    id: ownerId,
    email: cleanEmail,
    name: cleanName,
    facebookLinked: true,
    facebookEmail: cleanEmail,
    passwordLoginEnabled: false,
  };
  return { owner, sessionCookie: await createOwnerSession(owner) };
}

export async function disconnectFacebookOwner(ownerId: string): Promise<Owner> {
  if (!isD1Enabled()) throw new Error("Facebook account linking is unavailable in local dev mode.");
  const db = getD1()!;
  const row = await d1First<OwnerRow>(
    db
      .prepare(
        "SELECT id, email, full_name, password_hash, google_sub, google_email, facebook_id, facebook_email FROM owners WHERE id = ?",
      )
      .bind(ownerId),
  );
  if (!row) throw new Error("Owner not found.");
  if (!row.facebook_id) return mapOwner(row);
  if (!row.password_hash || row.password_hash === DISABLED_PASSWORD_HASH) {
    throw new Error("Add an email/password login before disconnecting Facebook.");
  }
  await d1Run(
    db
      .prepare(
        `UPDATE owners SET
           facebook_id = NULL, facebook_email = NULL, facebook_name = NULL,
           facebook_linked_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(ownerId),
  );
  return mapOwner({ ...row, facebook_id: null, facebook_email: null });
}
