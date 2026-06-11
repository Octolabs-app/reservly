import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError } from "@/lib/cf/api";
import { createService, deleteService, updateService } from "@/lib/cf/data";
import type { ServiceInput } from "@/lib/reservly/types";

type ServiceRequest =
  | { action: "create"; input: ServiceInput }
  | { action: "update"; input: Partial<ServiceInput> & { id: string } }
  | { action: "delete"; id: string };

export const Route = createFileRoute("/api/dashboard/service")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          const body = (await request.json()) as ServiceRequest;
          if (body.action === "create") {
            return Response.json(await createService(body.input, owner.id));
          }
          if (body.action === "update") {
            return Response.json(await updateService(body.input, owner.id));
          }
          await deleteService(body.id, owner.id);
          return Response.json({ ok: true });
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
