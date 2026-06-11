import { createFileRoute } from "@tanstack/react-router";
import { requireApiOwner, jsonError } from "@/lib/cf/api";
import { createBusiness, updateBusiness } from "@/lib/cf/data";
import type { BusinessInput } from "@/lib/reservly/types";

export const Route = createFileRoute("/api/dashboard/business")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          const input = (await request.json()) as BusinessInput;
          return Response.json(await createBusiness(input, owner));
        } catch (error) {
          return jsonError(error);
        }
      },
      PATCH: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        try {
          const input = (await request.json()) as Partial<BusinessInput> & { id: string };
          return Response.json(await updateBusiness(input, owner.id));
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
