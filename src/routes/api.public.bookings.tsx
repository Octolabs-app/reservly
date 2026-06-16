import { createFileRoute } from "@tanstack/react-router";
import { createBooking } from "@/lib/cf/data";
import { jsonError, requireSameOriginMutation } from "@/lib/cf/api";
import { allowRequest, clientIp } from "@/lib/cf/rate-limit";
import { normalizeWhatsAppNumber } from "@/lib/randevou/phone";
import type { BookingInput } from "@/lib/randevou/types";

export const Route = createFileRoute("/api/public/bookings")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;

        try {
          const input = (await request.json()) as BookingInput;

          // Soft anti-spam: per IP and per customer phone. Each booking can
          // trigger two WhatsApp sends, so unthrottled spam costs real money.
          const phoneKey = normalizeWhatsAppNumber(input.customerPhone ?? "");
          const [ipOk, phoneOk] = await Promise.all([
            allowRequest("book-ip", clientIp(request), 15, 600),
            phoneKey ? allowRequest("book-phone", phoneKey, 5, 3600) : Promise.resolve(true),
          ]);
          if (!ipOk || !phoneOk) {
            return Response.json(
              { error: "Too many booking attempts. Please try again later." },
              { status: 429 },
            );
          }

          return Response.json(await createBooking(input));
        } catch (error) {
          return jsonError(error);
        }
      },
    },
  },
});

function Empty() {
  return null;
}
