import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/lib/reservly/billing.server";

export const Route = createFileRoute("/api/stripe/webhook")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        const payload = await request.text();
        try {
          const result = await handleStripeWebhook(payload, signature);
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Webhook failed." },
            { status: 400 },
          );
        }
      },
    },
  },
});

function Empty() {
  return null;
}
