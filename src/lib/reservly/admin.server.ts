import type { SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin() {
  if (adminClient !== undefined) return adminClient;
  adminClient = null;
  return adminClient;
}

export async function logMessageEvent(input: {
  businessId?: string | null;
  bookingId?: string | null;
  direction: "outbound" | "inbound";
  recipientPhone?: string | null;
  body: string;
  status: string;
  providerMessageId?: string | null;
  rawPayload?: unknown;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.info("[Reservly message event]", input);
    return;
  }

  await supabase.from("message_events").insert({
    business_id: input.businessId ?? null,
    booking_id: input.bookingId ?? null,
    direction: input.direction,
    channel: "whatsapp",
    provider: "twilio",
    provider_message_id: input.providerMessageId ?? null,
    recipient_phone: input.recipientPhone ?? null,
    body: input.body,
    status: input.status,
    raw_payload: input.rawPayload ?? null,
  });
}
