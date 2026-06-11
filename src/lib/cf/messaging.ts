// src/lib/cf/messaging.ts
// WhatsApp messaging layer backed by Cloudflare D1 for event logging.
// Replaces: src/lib/reservly/messaging.server.ts + admin.server.ts (logMessageEvent)
//
// Twilio integration is unchanged — only the log-write destination moves from
// Supabase to D1.

import { getCFEnv, getD1, d1Run } from "./db";
import {
  renderBookingConfirmation,
  renderCancellationMessage,
  renderOwnerBookingAlert,
  type BookingMessageContext,
} from "./message-templates";

type MessageInput = {
  businessId?: string | null;
  bookingId?: string | null;
  to: string;
  body: string;
};

// ─── Message event logging ────────────────────────────────────────────────────

export async function logMessageEvent(input: {
  businessId?: string | null;
  bookingId?: string | null;
  direction: "outbound" | "inbound";
  recipientPhone?: string | null;
  body: string;
  status: string;
  providerMessageId?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  const db = getD1();
  if (!db) {
    console.info("[Reservly message event]", input);
    return;
  }

  const id = crypto.randomUUID();
  await d1Run(
    db
      .prepare(
        `
      INSERT INTO message_events
        (id, business_id, booking_id, direction, channel, provider,
         provider_message_id, recipient_phone, body, status, raw_payload)
      VALUES (?, ?, ?, ?, 'whatsapp', 'twilio', ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        id,
        input.businessId ?? null,
        input.bookingId ?? null,
        input.direction,
        input.providerMessageId ?? null,
        input.recipientPhone ?? null,
        input.body,
        input.status,
        input.rawPayload ? JSON.stringify(input.rawPayload) : null,
      ),
  );
}

// ─── Twilio send ──────────────────────────────────────────────────────────────

async function sendWhatsApp(
  input: MessageInput,
): Promise<{ sid: string | null; loggedOnly: boolean }> {
  const env = getCFEnv();
  const accountSid = env?.TWILIO_ACCOUNT_SID;
  const authToken = env?.TWILIO_AUTH_TOKEN;
  const from = env?.TWILIO_WHATSAPP_FROM;

  const ready = accountSid && authToken && from;

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
  const client = twilio(accountSid!, authToken!);
  const message = await client.messages.create({
    from: from!,
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

export { renderBookingConfirmation, renderCancellationMessage, renderOwnerBookingAlert };

export async function sendTemplatedBookingConfirmation(
  input: Omit<MessageInput, "body"> & { booking: BookingMessageContext },
) {
  return sendBookingConfirmation({
    ...input,
    body: renderBookingConfirmation(input.booking),
  });
}

export async function sendTemplatedOwnerBookingAlert(
  input: Omit<MessageInput, "body"> & { booking: BookingMessageContext },
) {
  return sendOwnerBookingAlert({
    ...input,
    body: renderOwnerBookingAlert(input.booking),
  });
}

export async function sendTemplatedCancellationMessage(
  input: Omit<MessageInput, "body"> & { booking: BookingMessageContext },
) {
  return sendCancellationMessage({
    ...input,
    body: renderCancellationMessage(input.booking),
  });
}

// ─── Inbound WhatsApp reply handler ──────────────────────────────────────────

export async function handleInboundWhatsAppReply(input: {
  from: string;
  body: string;
  rawPayload?: unknown;
}): Promise<{ updated: boolean; reason?: string; bookingId?: string; status?: string }> {
  const db = getD1();
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

  if (!db || !command) return { updated: false, reason: "not_actionable" };

  const phone = input.from.replace(/^whatsapp:/, "");
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db
    .prepare(
      `
      SELECT id, customer_phone, status, created_at FROM bookings
      WHERE customer_phone = ? AND status != 'cancelled' AND created_at >= ?
      ORDER BY created_at DESC LIMIT 2
    `,
    )
    .bind(phone, since)
    .all<{ id: string; status: string }>();

  if (!rows.success || rows.results.length !== 1) {
    return {
      updated: false,
      reason: rows.results.length > 1 ? "ambiguous" : "not_found",
    };
  }

  const bookingId = rows.results[0].id;
  await d1Run(
    db
      .prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(command, bookingId),
  );

  return { updated: true, bookingId, status: command };
}
