import { createFileRoute } from "@tanstack/react-router";
import { startFacebookAuth } from "@/lib/cf/facebook-auth";

export const Route = createFileRoute("/api/auth/facebook/start")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => startFacebookAuth(request),
    },
  },
});

function Empty() {
  return null;
}
