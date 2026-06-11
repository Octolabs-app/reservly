// src/lib/cf/billing.ts
// Stripe billing backed by Cloudflare D1.
// Replaces: src/lib/reservly/billing.server.ts (Supabase admin calls)

import Stripe from "stripe";
import { getCFEnv, getD1, d1Run } from "./db";

function getStripe(): Stripe | null {
  const env = getCFEnv();
  if (!env?.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(input: {
  businessId: string;
  plan: "pro" | "studio";
}): Promise<{ url: string | null; loggedOnly: boolean; message?: string }> {
  const env = getCFEnv();
  const stripe = getStripe();
  const price =
    input.plan === "pro" ? env?.STRIPE_PRICE_PRO_MONTHLY : env?.STRIPE_PRICE_STUDIO_MONTHLY;
  const siteUrl = env?.SITE_URL ?? "http://localhost:5173";

  if (!stripe || !price) {
    return { url: null, loggedOnly: true, message: "Stripe is not configured." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/settings?checkout=success`,
    cancel_url: `${siteUrl}/dashboard/settings?checkout=cancelled`,
    metadata: { business_id: input.businessId, plan: input.plan },
  });

  return { url: session.url, loggedOnly: false };
}

export async function handleStripeWebhook(
  payload: string,
  signature: string | null,
): Promise<{ received: boolean; skipped?: boolean }> {
  const env = getCFEnv();
  const stripe = getStripe();
  if (!stripe || !env?.STRIPE_WEBHOOK_SECRET || !signature) {
    return { received: true, skipped: true };
  }

  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  const db = getD1();
  if (!db) return { received: true, skipped: true };

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const businessId =
      "metadata" in object && typeof object.metadata?.business_id === "string"
        ? object.metadata.business_id
        : null;
    const plan =
      "metadata" in object &&
      (object.metadata?.plan === "pro" || object.metadata?.plan === "studio")
        ? object.metadata.plan
        : "free";

    if (businessId) {
      const active =
        event.type === "checkout.session.completed" ||
        ("status" in object &&
          typeof object.status === "string" &&
          ["active", "trialing"].includes(object.status));

      // Update business plan + limit
      await d1Run(
        db
          .prepare(
            `
          UPDATE businesses SET
            plan = ?, booking_limit_monthly = ?, updated_at = datetime('now')
          WHERE id = ?
        `,
          )
          .bind(active ? plan : "free", active ? null : 15, businessId),
      );

      // Upsert subscription record
      const stripeCustomerId =
        "customer" in object && typeof object.customer === "string" ? object.customer : null;
      const stripeSubId =
        "subscription" in object && typeof object.subscription === "string"
          ? object.subscription
          : "id" in object
            ? (object as Stripe.Subscription).id
            : null;
      const subStatus =
        "status" in object && typeof object.status === "string" ? object.status : "active";

      await d1Run(
        db
          .prepare(
            `
          INSERT INTO subscriptions
            (id, business_id, stripe_customer_id, stripe_subscription_id, plan, status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(business_id) DO UPDATE SET
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_subscription_id = excluded.stripe_subscription_id,
            plan = excluded.plan, status = excluded.status,
            updated_at = datetime('now')
        `,
          )
          .bind(
            crypto.randomUUID(),
            businessId,
            stripeCustomerId,
            stripeSubId,
            active ? plan : "free",
            subStatus,
          ),
      );
    }
  }

  return { received: true };
}
