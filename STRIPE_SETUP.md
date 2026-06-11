# Stripe Setup

## Required Variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_STUDIO_MONTHLY`

## Checkout

The checkout route is:

```text
POST /api/stripe/checkout
```

Payload:

```json
{
  "businessId": "business_uuid",
  "plan": "pro"
}
```

Use `plan: "studio"` for Studio checkout.

## Webhook

Configure Stripe to send events to:

```text
POST {SITE_URL}/api/stripe/webhook
```

The app handles checkout completion, subscription updates, and subscription deletion by updating the business plan and subscription row.

## Development Behavior

If Stripe env vars are missing, checkout returns a logged-only response and the app does not crash.
