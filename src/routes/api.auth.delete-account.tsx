import { createFileRoute } from "@tanstack/react-router";
import { deleteOwnerAccount, getSessionIdFromCookieHeader } from "@/lib/cf/auth";
import { requireApiOwner, jsonError, requireSameOriginMutation } from "@/lib/cf/api";

export const Route = createFileRoute("/api/auth/delete-account")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        try {
          const { confirm } = (await request.json()) as { confirm?: string };
          if (confirm !== "DELETE") {
            return Response.json(
              { error: 'Type "DELETE" to confirm account deletion.' },
              { status: 400 },
            );
          }
          const sessionId = getSessionIdFromCookieHeader(request.headers.get("cookie"));
          const clearCookie = await deleteOwnerAccount(owner.id, sessionId);
          return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie } });
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
