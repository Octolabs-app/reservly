import { createFileRoute } from "@tanstack/react-router";
import { finishFacebookAuth } from "@/lib/cf/facebook-auth";

export const Route = createFileRoute("/api/auth/facebook/callback")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => finishFacebookAuth(request),
    },
  },
});

function Empty() {
  return null;
}
