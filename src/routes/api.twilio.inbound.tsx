import { createFileRoute } from "@tanstack/react-router";
import { handleInboundWhatsAppReply, validateTwilioSignature } from "@/lib/cf/messaging";

function twiml(message: string | null): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, { headers: { "Content-Type": "text/xml" } });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/api/twilio/inbound")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const params: Record<string, string> = {};
        for (const [key, value] of form.entries()) params[key] = String(value);

        // Reject requests that don't carry a valid Twilio signature —
        // otherwise anyone could cancel bookings by guessing phone numbers.
        const valid = await validateTwilioSignature(request, params);
        if (!valid) {
          return Response.json({ error: "Invalid signature." }, { status: 403 });
        }

        const result = await handleInboundWhatsAppReply({
          from: params.From ?? "",
          body: params.Body ?? "",
          rawPayload: params,
        });
        return twiml(result.reply);
      },
    },
  },
});

function Empty() {
  return null;
}
