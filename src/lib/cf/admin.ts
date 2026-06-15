// src/lib/cf/admin.ts
// Platform-admin backbone: access gate, audit log, and read/mutate helpers.
//
// SECURITY: every /api/admin/* route MUST call requirePlatformAdmin(request)
// and reject non-admins with 403. The gate is the ADMIN_EMAILS env var
// (comma-separated owner emails). This is the MVP gate; normal business owners
// must never reach admin data or actions.

import { getCFEnv, getD1, d1All, d1First, d1Run, isD1Enabled } from "./db";
import { getCurrentOwner } from "./auth";
import { requireSameOriginMutation } from "./api";
import { getBillingConfig } from "./subscriptions";
import { sendTemplatedCancellationMessage } from "./messaging";
import {
  formatDateLabel,
  formatTimeLabel,
  isoFromMauritiusLocal,
  mauritiusMonthBounds,
  mauritiusTodayInput,
} from "@/lib/randevou/slots";
import type { BookingLanguage, Owner, Plan } from "@/lib/randevou/types";

// ─── Access gate ──────────────────────────────────────────────────────────────

export function adminEmails(): string[] {
  return (getCFEnv()?.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(owner: Owner | null | undefined): boolean {
  if (!owner?.email) return false;
  return adminEmails().includes(owner.email.trim().toLowerCase());
}

/**
 * Resolve the request to a platform admin, or return a Response (401/403).
 * Use at the top of every /api/admin/* handler.
 */
export async function requirePlatformAdmin(request: Request): Promise<Owner | Response> {
  const csrf = requireSameOriginMutation(request);
  if (csrf) return csrf;
  const owner = await getCurrentOwner(request);
  if (!owner) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  // Production (D1) enforces the ADMIN_EMAILS allowlist. Local dev mode has no
  // env/D1 and is single-user on localhost, so any signed-in dev owner passes
  // to keep /admin QA-able — this branch can never run in production.
  if (isD1Enabled() && !isPlatformAdmin(owner)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }
  return owner;
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export async function recordAdminAudit(input: {
  adminOwnerId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}): Promise<void> {
  const db = getD1();
  if (!db) return;
  await d1Run(
    db
      .prepare(
        `INSERT INTO admin_audit_events
           (id, admin_owner_id, action, target_type, target_id, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.adminOwnerId,
        input.action,
        input.targetType ?? null,
        input.targetId ?? null,
        input.metadata != null ? JSON.stringify(input.metadata).slice(0, 4000) : null,
      ),
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mask a phone for display: "+23057001234" → "+230 5•••• •34". */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length <= 4) return digits;
  const head = digits.slice(0, digits.length - 6);
  const tail = digits.slice(-2);
  return `${head}••••${tail}`;
}

async function count(sql: string, ...binds: unknown[]): Promise<number> {
  const db = getD1()!;
  const row = await d1First<{ n: number }>(db.prepare(sql).bind(...binds));
  return row?.n ?? 0;
}

// ─── Overview ───────────────────────────────────────────────────────────────

export async function getAdminOverview() {
  const db = getD1();
  if (!db) return null;
  const todayDate = mauritiusTodayInput();
  const dayStart = isoFromMauritiusLocal(todayDate, "00:00");
  const dayEnd = isoFromMauritiusLocal(
    new Date(new Date(`${todayDate}T12:00:00+04:00`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10),
    "00:00",
  );
  const { start: monthStart, end: monthEnd } = mauritiusMonthBounds(new Date().toISOString());

  const [
    totalOwners,
    totalBusinesses,
    totalBookings,
    bookingsToday,
    bookingsThisMonth,
    planRows,
    recentFailedMessages,
    recentBookings,
    recentBusinesses,
  ] = await Promise.all([
    count("SELECT COUNT(*) n FROM owners"),
    count("SELECT COUNT(*) n FROM businesses"),
    count("SELECT COUNT(*) n FROM bookings"),
    count(
      "SELECT COUNT(*) n FROM bookings WHERE status != 'cancelled' AND start_at >= ? AND start_at < ?",
      dayStart,
      dayEnd,
    ),
    count(
      "SELECT COUNT(*) n FROM bookings WHERE status != 'cancelled' AND start_at >= ? AND start_at < ?",
      monthStart,
      monthEnd,
    ),
    d1All<{ plan: string; n: number }>(
      db.prepare("SELECT plan, COUNT(*) n FROM businesses GROUP BY plan"),
    ),
    d1All<{
      id: string;
      recipient_phone: string | null;
      status: string;
      body: string;
      created_at: string;
    }>(
      db.prepare(
        "SELECT id, recipient_phone, status, body, created_at FROM message_events WHERE status LIKE 'failed%' ORDER BY created_at DESC LIMIT 10",
      ),
    ),
    d1All<{
      id: string;
      customer_name: string;
      start_at: string;
      status: string;
      booking_ref: string | null;
      business_name: string | null;
    }>(
      db.prepare(
        `SELECT b.id, b.customer_name, b.start_at, b.status, b.booking_ref, biz.name business_name
         FROM bookings b LEFT JOIN businesses biz ON biz.id = b.business_id
         ORDER BY b.created_at DESC LIMIT 10`,
      ),
    ),
    d1All<{ id: string; name: string; slug: string; plan: string; created_at: string }>(
      db.prepare(
        "SELECT id, name, slug, plan, created_at FROM businesses ORDER BY created_at DESC LIMIT 10",
      ),
    ),
  ]);

  const planCounts: Record<string, number> = { free: 0, pro: 0, studio: 0 };
  for (const r of planRows) planCounts[r.plan] = r.n;

  return {
    totals: { owners: totalOwners, businesses: totalBusinesses, bookings: totalBookings },
    bookingsToday,
    bookingsThisMonth,
    planCounts,
    recentFailedMessages: recentFailedMessages.map((m) => ({
      ...m,
      recipient_phone: maskPhone(m.recipient_phone),
    })),
    recentBookings,
    recentBusinesses,
  };
}

// ─── Businesses ───────────────────────────────────────────────────────────────

export async function listAdminBusinesses(query?: string) {
  const db = getD1();
  if (!db) return [];
  const q = `%${(query ?? "").trim().toLowerCase()}%`;
  const rows = await d1All<{
    id: string;
    name: string;
    slug: string;
    category: string;
    city: string;
    plan: string;
    booking_limit_monthly: number | null;
    owner_email: string | null;
    booking_count: number;
    sub_status: string | null;
    sub_end: string | null;
    sub_ref: string | null;
  }>(
    db
      .prepare(
        `SELECT biz.id, biz.name, biz.slug, biz.category, biz.city, biz.plan,
                biz.booking_limit_monthly,
                o.email owner_email,
                (SELECT COUNT(*) FROM bookings bk WHERE bk.business_id = biz.id) booking_count,
                sub.status sub_status,
                sub.current_period_end sub_end,
                sub.payment_reference sub_ref
         FROM businesses biz
         LEFT JOIN owners o ON o.id = biz.owner_id
         LEFT JOIN subscriptions sub ON sub.business_id = biz.id
         WHERE (? = '%%') OR lower(biz.name) LIKE ? OR lower(biz.slug) LIKE ? OR lower(o.email) LIKE ?
         ORDER BY biz.created_at DESC LIMIT 100`,
      )
      .bind(q, q, q, q),
  );
  return rows;
}

export async function adminUpdateBusinessPlan(
  businessId: string,
  plan: Plan,
  adminOwnerId: string,
) {
  const db = getD1();
  if (!db) throw new Error("Not available in local dev mode.");
  await d1Run(
    db
      .prepare(
        "UPDATE businesses SET plan = ?, booking_limit_monthly = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(plan, plan === "free" ? 15 : null, businessId),
  );
  await recordAdminAudit({
    adminOwnerId,
    action: "business.update_plan",
    targetType: "business",
    targetId: businessId,
    metadata: { plan },
  });
}

export async function adminUpdateBookingLimit(
  businessId: string,
  limit: number | null,
  adminOwnerId: string,
) {
  const db = getD1();
  if (!db) throw new Error("Not available in local dev mode.");
  const clamped = limit == null ? null : Math.max(0, Math.min(100000, Math.round(limit)));
  await d1Run(
    db
      .prepare(
        "UPDATE businesses SET booking_limit_monthly = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(clamped, businessId),
  );
  await recordAdminAudit({
    adminOwnerId,
    action: "business.update_limit",
    targetType: "business",
    targetId: businessId,
    metadata: { limit: clamped },
  });
}

// ─── Owners ───────────────────────────────────────────────────────────────────

export async function listAdminOwners(query?: string) {
  const db = getD1();
  if (!db) return [];
  const q = `%${(query ?? "").trim().toLowerCase()}%`;
  return d1All<{
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    business_count: number;
  }>(
    db
      .prepare(
        `SELECT o.id, o.email, o.full_name, o.created_at,
                (SELECT COUNT(*) FROM businesses b WHERE b.owner_id = o.id) business_count
         FROM owners o
         WHERE (? = '%%') OR lower(o.email) LIKE ? OR lower(COALESCE(o.full_name,'')) LIKE ?
         ORDER BY o.created_at DESC LIMIT 100`,
      )
      .bind(q, q, q),
  );
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function listAdminBookings(filter: { query?: string; status?: string }) {
  const db = getD1();
  if (!db) return [];
  const q = `%${(filter.query ?? "").trim().toLowerCase()}%`;
  const status = filter.status && filter.status !== "all" ? filter.status : null;
  const rows = await d1All<{
    id: string;
    customer_name: string;
    customer_phone: string;
    start_at: string;
    status: string;
    booking_ref: string | null;
    service_name: string | null;
    business_name: string | null;
  }>(
    db
      .prepare(
        `SELECT b.id, b.customer_name, b.customer_phone, b.start_at, b.status, b.booking_ref,
                s.name service_name, biz.name business_name
         FROM bookings b
         LEFT JOIN services s ON s.id = b.service_id
         LEFT JOIN businesses biz ON biz.id = b.business_id
         WHERE ((? = '%%') OR lower(b.customer_name) LIKE ? OR b.customer_phone LIKE ?
                OR lower(COALESCE(b.booking_ref,'')) LIKE ? OR lower(COALESCE(biz.name,'')) LIKE ?)
           AND (? IS NULL OR b.status = ?)
         ORDER BY b.start_at DESC LIMIT 100`,
      )
      .bind(q, q, q, q, q, status, status),
  );
  return rows.map((r) => ({ ...r, customer_phone: maskPhone(r.customer_phone) }));
}

/** Admin booking status change (bypasses owner check) + audit + customer WhatsApp. */
export async function adminSetBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled",
  adminOwnerId: string,
) {
  const db = getD1();
  if (!db) throw new Error("Not available in local dev mode.");
  const row = await d1First<{
    id: string;
    business_id: string;
    customer_name: string;
    customer_phone: string;
    customer_language: string;
    start_at: string;
    service_name: string | null;
    service_price_label: string | null;
    business_name: string | null;
  }>(
    db
      .prepare(
        `SELECT b.id, b.business_id, b.customer_name, b.customer_phone, b.customer_language,
                b.start_at, s.name service_name, s.price_label service_price_label,
                biz.name business_name
         FROM bookings b
         LEFT JOIN services s ON s.id = b.service_id
         LEFT JOIN businesses biz ON biz.id = b.business_id
         WHERE b.id = ?`,
      )
      .bind(bookingId),
  );
  if (!row) throw new Error("Booking not found.");

  await d1Run(
    db
      .prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, bookingId),
  );

  await recordAdminAudit({
    adminOwnerId,
    action: status === "cancelled" ? "booking.cancel" : "booking.confirm",
    targetType: "booking",
    targetId: bookingId,
    metadata: { businessId: row.business_id },
  });

  if (status === "cancelled" && row.customer_phone) {
    await sendTemplatedCancellationMessage({
      businessId: row.business_id,
      bookingId: row.id,
      to: row.customer_phone,
      booking: {
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        businessName: row.business_name ?? "the business",
        serviceName: row.service_name ?? "your service",
        priceLabel: row.service_price_label,
        dateLabel: formatDateLabel(row.start_at, { year: "numeric" }),
        timeLabel: formatTimeLabel(row.start_at),
        language: (row.customer_language as BookingLanguage) ?? "Both",
      },
    });
  }
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export async function listAdminMessageEvents() {
  const db = getD1();
  if (!db) return [];
  const rows = await d1All<{
    id: string;
    direction: string;
    recipient_phone: string | null;
    body: string;
    status: string;
    created_at: string;
    business_name: string | null;
  }>(
    db.prepare(
      `SELECT m.id, m.direction, m.recipient_phone, m.body, m.status, m.created_at,
              biz.name business_name
       FROM message_events m
       LEFT JOIN businesses biz ON biz.id = m.business_id
       ORDER BY m.created_at DESC LIMIT 100`,
    ),
  );
  return rows.map((r) => ({ ...r, recipient_phone: maskPhone(r.recipient_phone) }));
}

// ─── System health ─────────────────────────────────────────────────────────

export function getSystemHealth() {
  const env = getCFEnv();
  const billing = getBillingConfig();
  return {
    twilioConfigured: Boolean(
      env?.TWILIO_ACCOUNT_SID && env?.TWILIO_AUTH_TOKEN && env?.TWILIO_WHATSAPP_FROM,
    ),
    paddleConfigured: billing.paddle,
    dodoConfigured: billing.dodo,
    paypalManualConfigured: billing.paypalManual,
    stripeConfigured: billing.stripe,
    d1Available: Boolean(getD1()),
    kvAvailable: Boolean(getCFEnv()?.KV),
    siteUrl: env?.SITE_URL ?? null,
    adminCount: adminEmails().length,
  };
}

// ─── Audit log view ─────────────────────────────────────────────────────────

export async function listAuditEvents() {
  const db = getD1();
  if (!db) return [];
  return d1All<{
    id: string;
    admin_owner_id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    metadata_json: string | null;
    created_at: string;
    admin_email: string | null;
  }>(
    db.prepare(
      `SELECT a.id, a.admin_owner_id, a.action, a.target_type, a.target_id, a.metadata_json,
              a.created_at, o.email admin_email
       FROM admin_audit_events a
       LEFT JOIN owners o ON o.id = a.admin_owner_id
       ORDER BY a.created_at DESC LIMIT 100`,
    ),
  );
}
