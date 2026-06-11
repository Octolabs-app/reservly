import { createFileRoute } from "@tanstack/react-router";
import { getBookingById } from "@/lib/cf/data";
import { jsonError } from "@/lib/cf/api";

export const Route = createFileRoute("/api/public/booking")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return jsonError(new Error("Missing booking id."), 400);
        try {
          return Response.json(await getBookingById(id));
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
