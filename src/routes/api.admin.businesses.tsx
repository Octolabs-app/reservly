import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/cf/api";
import {
  adminUpdateBookingLimit,
  adminUpdateBusinessPlan,
  listAdminBusinesses,
  requirePlatformAdmin,
} from "@/lib/cf/admin";
import { recordManualPayment } from "@/lib/cf/subscriptions";
import { recordAdminAudit } from "@/lib/cf/admin";
import type { Plan } from "@/lib/randevou/types";

type Body =
  | { action: "update_plan"; businessId: string; plan: Plan }
  | { action: "update_limit"; businessId: string; limit: number | null }
  | {
      action: "manual_pay";
      businessId: string;
      plan: Plan;
      provider?: "manual" | "paypal_manual";
      note?: string;
      reference?: string;
    };

export const Route = createFileRoute("/api/admin/businesses")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          const q = new URL(request.url).searchParams.get("q") ?? "";
          return Response.json({ businesses: await listAdminBusinesses(q) });
        } catch (error) {
          return jsonError(error, 500);
        }
      },
      POST: async ({ request }) => {
        const admin = await requirePlatformAdmin(request);
        if (admin instanceof Response) return admin;
        try {
          const body = (await request.json()) as Body;
          if (!body.businessId) return jsonError(new Error("businessId required."));
          if (body.action === "update_plan") {
            await adminUpdateBusinessPlan(body.businessId, body.plan, admin.id);
          } else if (body.action === "update_limit") {
            await adminUpdateBookingLimit(body.businessId, body.limit, admin.id);
          } else if (body.action === "manual_pay") {
            await recordManualPayment({
              businessId: body.businessId,
              plan: body.plan,
              provider: body.provider ?? "paypal_manual",
              note: body.note ?? null,
              reference: body.reference ?? null,
            });
            await recordAdminAudit({
              adminOwnerId: admin.id,
              action: "billing.manual_pay",
              targetType: "business",
              targetId: body.businessId,
              metadata: { plan: body.plan, provider: body.provider ?? "paypal_manual" },
            });
          } else {
            return jsonError(new Error("Unknown action."));
          }
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
