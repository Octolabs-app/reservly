import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/cf/api";
import { listAuditEvents, requirePlatformAdmin } from "@/lib/cf/admin";

export const Route = createFileRoute("/api/admin/audit")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          return Response.json({ events: await listAuditEvents() });
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
