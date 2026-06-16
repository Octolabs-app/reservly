import { createFileRoute } from "@tanstack/react-router";
import { disconnectGoogleOwner } from "@/lib/cf/auth";
import { jsonError, requireApiOwner, requireSameOriginMutation } from "@/lib/cf/api";

export const Route = createFileRoute("/api/auth/google/disconnect")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        try {
          return Response.json({ owner: await disconnectGoogleOwner(owner.id) });
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
