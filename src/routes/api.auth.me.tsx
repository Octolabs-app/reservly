import { createFileRoute } from "@tanstack/react-router";
import { getCurrentOwner, getSessionIdFromCookieHeader, resolveSession } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth/me")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const sessionId = getSessionIdFromCookieHeader(request.headers.get("cookie"));
        if (!sessionId) return Response.json(await getCurrentOwner(request));
        const owner = await resolveSession(sessionId);
        return Response.json(owner ?? null);
      },
    },
  },
});

function Empty() {
  return null;
}
