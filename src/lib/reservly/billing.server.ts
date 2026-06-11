import Stripe from "stripe";
import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "./admin.server";

function getStripe() {
  const config = getServerConfig();
  if (!config.stripeSecretKey) return null;
  return new Stripe(config.stripeSecretKey);
}

export async function createCheckoutSession(input: { businessId: string; plan: "pro" | "studio" }) {
  const config = getServerConfig();
  const stripe = getStripe();
  const price =
    input.plan === "pro" ? config.stripePriceProMonthly : config.stripePriceStudioMonthly;

  if (!stripe || !price) {
    return {
      url: null,
      loggedOnly: true,
      message: "Stripe is not configured.",
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${config.siteUrl}/dashboard/settings?checkout=success`,
    cancel_url: `${config.siteUrl}/dashboard/settings?checkout=cancelled`,
    metadata: {
      business_id: input.businessId,
      plan: input.plan,
    },
  });

  return { url: session.url, loggedOnly: false };
}

export async function handleStripeWebhook(payload: string, signature: string | null) {
  const config = getServerConfig();
  const stripe = getStripe();
  if (!stripe || !config.stripeWebhookSecret || !signature) {
    return { received: true, skipped: true };
  }

  const event = stripe.webhooks.constructEvent(payload, signature, config.stripeWebhookSecret);
  const supabase = getSupabaseAdmin();
  if (!supabase) return { received: true, skipped: true };

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
      await supabase
        .from("businesses")
        .update({
          plan: active ? plan : "free",
          booking_limit_monthly: active ? null : 15,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      await supabase.from("subscriptions").upsert({
        business_id: businessId,
        plan: active ? plan : "free",
        status: "status" in object && typeof object.status === "string" ? object.status : "active",
        stripe_customer_id:
          "customer" in object && typeof object.customer === "string" ? object.customer : null,
        stripe_subscription_id:
          "subscription" in object && typeof object.subscription === "string"
            ? object.subscription
            : "id" in object
              ? object.id
              : null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { received: true };
}
