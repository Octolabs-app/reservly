import { createFileRoute } from "@tanstack/react-router";
import { signOutOwner, resolveSession, getSessionIdFromCookieHeader } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth/signout")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sessionId = getSessionIdFromCookieHeader(request.headers.get("cookie"));
        const clearCookie = await signOutOwner(sessionId ?? "");
        return Response.json({}, { headers: { "Set-Cookie": clearCookie } });
      },
    },
  },
});

function Empty() { return null; }
