import { createFileRoute } from "@tanstack/react-router";
import { getCurrentOwner } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth/me")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const owner = await getCurrentOwner(request);
        if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
        return Response.json(owner);
      },
    },
  },
});

function Empty() {
  return null;
}
