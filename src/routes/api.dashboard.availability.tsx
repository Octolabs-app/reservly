import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError } from "@/lib/cf/api";
import { updateAvailability } from "@/lib/cf/data";
import type { AvailabilityInput } from "@/lib/randevou/types";

export const Route = createFileRoute("/api/dashboard/availability")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          const input = (await request.json()) as AvailabilityInput;
          return Response.json(await updateAvailability(input, owner.id));
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
