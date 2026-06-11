import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError } from "@/lib/cf/api";
import { getDashboardData } from "@/lib/cf/data";

export const Route = createFileRoute("/api/dashboard/data")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          return Response.json(await getDashboardData(owner));
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
