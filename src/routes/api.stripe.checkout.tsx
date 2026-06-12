import { createFileRoute } from "@tanstack/react-router";
import { createCheckoutSession } from "@/lib/cf/billing";
import { requireApiOwner, jsonError } from "@/lib/cf/api";
import { assertBusinessOwnership } from "@/lib/cf/data";

export const Route = createFileRoute("/api/stripe/checkout")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          const body = (await request.json()) as { businessId?: string; plan?: "pro" | "studio" };
          if (!body.businessId || (body.plan !== "pro" && body.plan !== "studio")) {
            return Response.json({ error: "Invalid checkout request." }, { status: 400 });
          }
          await assertBusinessOwnership(body.businessId, owner.id);
          const result = await createCheckoutSession({
            businessId: body.businessId,
            plan: body.plan,
          });
          return Response.json(result);
        } catch (error) {
          return jsonError(error);
        }
      },
    },
  },
});

function Empty() {
  return null;
}
