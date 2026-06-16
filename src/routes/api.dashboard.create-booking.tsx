import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError, requireSameOriginMutation } from "@/lib/cf/api";
import { createOwnerBooking } from "@/lib/cf/data";
import type { BookingInput } from "@/lib/randevou/types";

export const Route = createFileRoute("/api/dashboard/create-booking")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        try {
          const input = (await request.json()) as BookingInput;
          return Response.json(await createOwnerBooking(input, owner.id));
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
