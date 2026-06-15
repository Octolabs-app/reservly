// src/lib/cf/subscriptions.ts
// No-BRN-friendly billing abstraction.
//
// Randevou bills BUSINESS OWNERS for their SaaS subscription only. It never
// processes customer→business appointment payments (no marketplace flow).
//
// Provider order of preference (founder direction):
//   1. paddle_individual  — Paddle as Individual / Sole Trader (primary)
//   2. dodo_individual    — Dodo Payments individual / unregistered (backup)
//   3. paypal_manual      — manual PayPal links, reconciled by admin (fallback)
//   4. manual             — any other manual/bank arrangement, tracked by admin
//   5. stripe_future      — only if Octolabs later has a supported legal setup
//
// No BRN / company registration is ever required. We never claim a provider is
// "live" unless its credentials are actually present in the environment.

import { getCFEnv, getD1, d1First, d1Run } from "./db";
import type { BillingProvider, Plan, Subscription, SubscriptionStatus } from "@/lib/randevou/types";

type SubscriptionRow = {
  business_id: string;
  provider: string | null;
  plan: string;
  status: string;
  payment_note: string | null;
  payment_reference: string | null;
  current_period_end: string | null;
  updated_at: string;
};

const VALID_PROVIDERS: BillingProvider[] = [
  "manual",
  "paddle_individual",
  "dodo_individual",
  "paypal_manual",
  "stripe_future",
];

const VALID_STATUSES: SubscriptionStatus[] = [
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "manual",
];

function mapSubscription(row: SubscriptionRow): Subscription {
  const provider = VALID_PROVIDERS.includes(row.provider as BillingProvider)
    ? (row.provider as BillingProvider)
    : "manual";
  const status = VALID_STATUSES.includes(row.status as SubscriptionStatus)
    ? (row.status as SubscriptionStatus)
    : "free";
  const plan: Plan = row.plan === "pro" || row.plan === "studio" ? row.plan : "free";
  return {
    businessId: row.business_id,
    provider,
    plan,
    status,
    paymentNote: row.payment_note,
    paymentReference: row.payment_reference,
    currentPeriodEnd: row.current_period_end,
    updatedAt: row.updated_at,
  };
}

/** Which billing providers actually have credentials configured (no secrets revealed). */
export function getBillingConfig() {
  const env = getCFEnv();
  return {
    paddle: Boolean(env?.PADDLE_API_KEY && env?.PADDLE_PRICE_PRO),
    dodo: Boolean(env?.DODO_API_KEY && env?.DODO_PRICE_PRO),
    paypalManual: true, // always available — needs no credentials
    stripe: Boolean(env?.STRIPE_SECRET_KEY),
  };
}

/**
 * The provider an owner-facing "upgrade" should use right now. Falls back to
 * paypal_manual until an automated provider is configured. Stripe is never
 * auto-selected (future only).
 */
export function getActiveBillingProvider(): BillingProvider {
  const cfg = getBillingConfig();
  if (cfg.paddle) return "paddle_individual";
  if (cfg.dodo) return "dodo_individual";
  return "paypal_manual";
}

/** True only when an automated provider is actually wired up. */
export function isAutomatedBillingLive(): boolean {
  const cfg = getBillingConfig();
  return cfg.paddle || cfg.dodo;
}

export async function getSubscriptionForBusiness(businessId: string): Promise<Subscription | null> {
  const db = getD1();
  if (!db) return null;
  const row = await d1First<SubscriptionRow>(
    db.prepare("SELECT * FROM subscriptions WHERE business_id = ?").bind(businessId),
  );
  return row ? mapSubscription(row) : null;
}

/**
 * Admin-recorded manual payment (PayPal link, bank transfer, cash, etc.).
 * Upserts the subscription row AND moves the business onto the chosen plan.
 * No BRN, no company details — just a provider tag + free-text note/reference.
 */
export async function recordManualPayment(input: {
  businessId: string;
  plan: Plan;
  provider?: Extract<BillingProvider, "manual" | "paypal_manual">;
  note?: string | null;
  reference?: string | null;
  /** Days from today the subscription is valid for (default 30). Pass 0 for indefinite (null end). */
  periodDays?: number | null;
}): Promise<Subscription> {
  const db = getD1();
  if (!db) throw new Error("Database unavailable.");
  const provider = input.provider ?? "paypal_manual";
  const status: SubscriptionStatus = input.plan === "free" ? "canceled" : "manual";
  const days = input.periodDays == null ? 30 : input.periodDays;
  const periodEnd = days > 0
    ? new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 19).replace("T", " ")
    : null;

  await d1Run(
    db
      .prepare(
        `
      INSERT INTO subscriptions
        (id, business_id, plan, status, provider, payment_note, payment_reference,
         current_period_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(business_id) DO UPDATE SET
        plan = excluded.plan,
        status = excluded.status,
        provider = excluded.provider,
        payment_note = excluded.payment_note,
        payment_reference = excluded.payment_reference,
        current_period_end = excluded.current_period_end,
        updated_at = datetime('now')
    `,
      )
      .bind(
        crypto.randomUUID(),
        input.businessId,
        input.plan,
        status,
        provider,
        input.note ?? null,
        input.reference ?? null,
        periodEnd,
      ),
  );

  // Reflect the plan on the business so booking limits unlock immediately.
  // Free keeps the 15/month limit; paid plans are unlimited (NULL).
  await d1Run(
    db
      .prepare(
        "UPDATE businesses SET plan = ?, booking_limit_monthly = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(input.plan, input.plan === "free" ? 15 : null, input.businessId),
  );

  return (await getSubscriptionForBusiness(input.businessId))!;
}
