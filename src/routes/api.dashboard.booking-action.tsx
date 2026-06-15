import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError, requireSameOriginMutation } from "@/lib/cf/api";
import { cancelBooking, markBookingConfirmed } from "@/lib/cf/data";

export const Route = createFileRoute("/api/dashboard/booking-action")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        try {
          const body = (await request.json()) as { id?: string; action?: "cancel" | "confirm" };
          if (!body.id || !body.action) return jsonError(new Error("Missing booking action."), 400);
          const booking =
            body.action === "cancel"
              ? await cancelBooking(body.id, owner.id)
              : await markBookingConfirmed(body.id, owner.id);
          return Response.json(booking);
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
