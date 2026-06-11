import { createFileRoute } from "@tanstack/react-router";
import { createBooking } from "@/lib/cf/data";
import { jsonError } from "@/lib/cf/api";
import type { BookingInput } from "@/lib/reservly/types";

export const Route = createFileRoute("/api/public/bookings")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = (await request.json()) as BookingInput;
          return Response.json(await createBooking(input));
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
