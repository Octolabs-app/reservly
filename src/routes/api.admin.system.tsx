import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/cf/api";
import { getSystemHealth, requirePlatformAdmin } from "@/lib/cf/admin";

export const Route = createFileRoute("/api/admin/system")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          // Config health flags only — never any secret values.
          return Response.json(getSystemHealth());
        } catch (error) {
          return jsonError(error, 500);
        }
      },
    },
  },
});

function Empty() {
  return null;
}
