import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin, logMessageEvent } from "./admin.server";

type MessageInput = {
  businessId?: string | null;
  bookingId?: string | null;
  to: string;
  body: string;
};

async function sendWhatsApp(input: MessageInput) {
  const config = getServerConfig();
  const ready = config.twilioAccountSid && config.twilioAuthToken && config.twilioWhatsappFrom;

  if (!ready) {
    await logMessageEvent({
      businessId: input.businessId,
      bookingId: input.bookingId,
      direction: "outbound",
      recipientPhone: input.to,
      body: input.body,
      status: "logged_dev",
    });
    return { sid: null, loggedOnly: true };
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(config.twilioAccountSid!, config.twilioAuthToken!);
  const message = await client.messages.create({
    from: config.twilioWhatsappFrom!,
    to: input.to.startsWith("whatsapp:") ? input.to : `whatsapp:${input.to}`,
    body: input.body,
  });

  await logMessageEvent({
    businessId: input.businessId,
    bookingId: input.bookingId,
    direction: "outbound",
    recipientPhone: input.to,
    body: input.body,
    status: message.status,
    providerMessageId: message.sid,
  });

  return { sid: message.sid, loggedOnly: false };
}

export async function sendBookingConfirmation(input: MessageInput) {
  return sendWhatsApp(input);
}

export async function sendOwnerBookingAlert(input: MessageInput) {
  return sendWhatsApp(input);
}

export async function sendCancellationMessage(input: MessageInput) {
  return sendWhatsApp(input);
}

export async function handleInboundWhatsAppReply(input: {
  from: string;
  body: string;
  rawPayload?: unknown;
}) {
  const supabase = getSupabaseAdmin();
  const normalized = input.body.trim().toUpperCase();
  const command = ["CONFIRM", "CONFIRMED", "YES", "OUI"].includes(normalized)
    ? "confirmed"
    : ["CANCEL", "CANCELLED", "NON"].includes(normalized)
      ? "cancelled"
      : null;

  await logMessageEvent({
    direction: "inbound",
    recipientPhone: input.from,
    body: input.body,
    status: command ?? "unhandled",
    rawPayload: input.rawPayload,
  });

  if (!supabase || !command) return { updated: false, reason: "not_actionable" };

  const phone = input.from.replace(/^whatsapp:/, "");
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select("id,customer_phone,status,created_at")
    .eq("customer_phone", phone)
    .neq("status", "cancelled")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error || !data || data.length !== 1) {
    return { updated: false, reason: data && data.length > 1 ? "ambiguous" : "not_found" };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: command, updated_at: new Date().toISOString() })
    .eq("id", data[0].id);

  if (updateError) throw updateError;
  return { updated: true, bookingId: data[0].id, status: command };
}
