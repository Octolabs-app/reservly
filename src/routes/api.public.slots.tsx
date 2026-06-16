import { createFileRoute } from "@tanstack/react-router";
import { getAvailableSlots } from "@/lib/cf/data";
import { jsonError } from "@/lib/cf/api";

export const Route = createFileRoute("/api/public/slots")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const businessId = params.get("businessId");
        const serviceId = params.get("serviceId");
        const date = params.get("date");
        if (!businessId || !serviceId || !date) {
          return jsonError(new Error("Missing slot parameters."), 400);
        }
        try {
          return Response.json(await getAvailableSlots(businessId, serviceId, date));
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
