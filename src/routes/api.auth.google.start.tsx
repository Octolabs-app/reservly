import { createFileRoute } from "@tanstack/react-router";
import { startGoogleAuth } from "@/lib/cf/google-auth";

export const Route = createFileRoute("/api/auth/google/start")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => startGoogleAuth(request),
    },
  },
});

function Empty() {
  return null;
}
