import { createFileRoute } from "@tanstack/react-router";
import { handleInboundWhatsAppReply } from "@/lib/reservly/messaging.server";

export const Route = createFileRoute("/api/twilio/inbound")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const from = String(form.get("From") ?? "");
        const body = String(form.get("Body") ?? "");
        const result = await handleInboundWhatsAppReply({
          from,
          body,
          rawPayload: Object.fromEntries(form.entries()),
        });
        return Response.json(result);
      },
    },
  },
});

function Empty() {
  return null;
}
