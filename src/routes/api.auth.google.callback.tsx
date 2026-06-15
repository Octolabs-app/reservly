import { createFileRoute } from "@tanstack/react-router";
import { finishGoogleAuth } from "@/lib/cf/google-auth";

export const Route = createFileRoute("/api/auth/google/callback")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => finishGoogleAuth(request),
    },
  },
});

function Empty() {
  return null;
}
