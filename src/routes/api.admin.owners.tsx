import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/cf/api";
import { listAdminOwners, requirePlatformAdmin } from "@/lib/cf/admin";

export const Route = createFileRoute("/api/admin/owners")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          const q = new URL(request.url).searchParams.get("q") ?? "";
          return Response.json({ owners: await listAdminOwners(q) });
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
