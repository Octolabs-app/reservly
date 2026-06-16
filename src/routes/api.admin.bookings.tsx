import { createFileRoute } from "@tanstack/react-router";
import { jsonError, requireSameOriginMutation } from "@/lib/cf/api";
import { adminSetBookingStatus, listAdminBookings, requirePlatformAdmin } from "@/lib/cf/admin";

type Body = { action: "confirm" | "cancel"; bookingId: string };

export const Route = createFileRoute("/api/admin/bookings")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          const params = new URL(request.url).searchParams;
          const bookings = await listAdminBookings({
            query: params.get("q") ?? "",
            status: params.get("status") ?? "all",
          });
          return Response.json({ bookings });
        } catch (error) {
          return jsonError(error, 500);
        }
      },
      POST: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        try {
          const body = (await request.json()) as Body;
          if (!body.bookingId) return jsonError(new Error("bookingId required."));
          await adminSetBookingStatus(
            body.bookingId,
            body.action === "cancel" ? "cancelled" : "confirmed",
            admin.id,
          );
          return Response.json({ ok: true });
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
