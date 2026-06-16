// This endpoint has been replaced by /api/meta/wa/webhook (Meta Cloud API).
// Kept as a 410 Gone stub so the route tree doesn't drift.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/twilio/inbound")({
  component: Empty,
  server: {
    handlers: {
      POST: async () => new Response("Gone", { status: 410 }),
    },
  },
});

function Empty() {
  return null;
}
