import { createFileRoute } from "@tanstack/react-router";
import { createCheckoutSession } from "@/lib/reservly/billing.server";

export const Route = createFileRoute("/api/stripe/checkout")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { businessId?: string; plan?: "pro" | "studio" };
        if (!body.businessId || (body.plan !== "pro" && body.plan !== "studio")) {
          return Response.json({ error: "Invalid checkout request." }, { status: 400 });
        }

        const result = await createCheckoutSession({
          businessId: body.businessId,
          plan: body.plan,
        });
        return Response.json(result);
      },
    },
  },
});

function Empty() {
  return null;
}
