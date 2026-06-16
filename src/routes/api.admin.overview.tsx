import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/cf/api";
import { getAdminOverview, requirePlatformAdmin } from "@/lib/cf/admin";

export const Route = createFileRoute("/api/admin/overview")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          return Response.json((await getAdminOverview()) ?? { devMode: true });
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
