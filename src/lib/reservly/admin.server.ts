import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerConfig } from "@/lib/config.server";

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin() {
  if (adminClient !== undefined) return adminClient;
  const config = getServerConfig();

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
