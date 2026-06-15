import { createFileRoute } from "@tanstack/react-router";
import { getCFEnv } from "@/lib/cf/db";
import { getCurrentOwner } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/billing/config")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const owner = await getCurrentOwner(request);
        if (!owner) return Response.json({ error: "Authentication required." }, { status: 401 });
        const env = getCFEnv();
        return Response.json({
          paypalUrl: env?.PAYPAL_ME_URL ?? null,
          contactEmail: "hello@octolabs.app",
        });
      },
    },
  },
});

function Empty() {
  return null;
}
