import { createFileRoute } from "@tanstack/react-router";
import {
  handleInboundWhatsAppReply,
  metaVerifyToken,
  sendBookingConfirmation,
  validateMetaWebhookSignature,
} from "@/lib/cf/messaging";

// Meta Cloud API webhook — two methods:
//   GET  → hub verification (Meta calls this when you first register the webhook)
//   POST → inbound message events from customers / business owners

type MetaWebhookEntry = {
  id?: string;
  changes?: Array<{
    value?: {
      messages?: Array<{
        from?: string;
        text?: { body?: string };
        type?: string;
      }>;
    };
  }>;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: MetaWebhookEntry[];
};

export const Route = createFileRoute("/api/meta/wa/webhook")({
  component: Empty,
  server: {
    handlers: {
      // ── Hub verification ─────────────────────────────────────────────────
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const challenge = url.searchParams.get("hub.challenge");
        const token = url.searchParams.get("hub.verify_token");

        if (mode !== "subscribe" || !challenge) {
          return new Response("Bad request", { status: 400 });
        }

        const expected = metaVerifyToken();
        if (expected && token !== expected) {
          return new Response("Forbidden", { status: 403 });
        }

        // Respond with the challenge to confirm ownership of the endpoint.
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },

      // ── Inbound messages ─────────────────────────────────────────────────
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const valid = await validateMetaWebhookSignature(
          rawBody,
          request.headers.get("x-hub-signature-256"),
        );
        if (!valid) {
          return new Response("Forbidden", { status: 403 });
        }

        let payload: MetaWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as MetaWebhookPayload;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        // Meta always expects 200 quickly — process async by not awaiting long work.
        // We process synchronously here because CF Workers run to completion.
        if (payload.object === "whatsapp_business_account") {
          for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
              for (const msg of change.value?.messages ?? []) {
                if (msg.type !== "text" || !msg.from || !msg.text?.body) continue;

                const result = await handleInboundWhatsAppReply({
                  from: msg.from,
                  body: msg.text.body,
                  rawPayload: msg,
                });

                // Meta Cloud API doesn't support synchronous replies in the
                // webhook response body — send the reply as a separate API call.
                if (result.reply && result.replyTo) {
                  await sendBookingConfirmation({ to: result.replyTo, body: result.reply });
                }
              }
            }
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});

function Empty() {
  return null;
}
