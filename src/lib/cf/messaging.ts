// src/lib/cf/messaging.ts
// WhatsApp messaging via Meta Cloud API (plain fetch — Workers-safe, no SDK).
// Inbound webhook handling + HMAC-SHA256 signature validation.

import { getCFEnv, getD1, d1All, d1First, d1Run } from "./db";
import {
  renderBookingConfirmation,
  renderCancellationMessage,
  renderChooseRefToCancel,
  renderOwnerBookingAlert,
  renderRefNotFound,
  renderReplyAck,
  type BookingMessageContext,
} from "./message-templates";
import { formatDateLabel, formatTimeLabel } from "@/lib/randevou/slots";
import { isBookingRef, normalizeBookingRef } from "@/lib/randevou/ref";
import type { BookingLanguage } from "@/lib/randevou/types";

/**
 * Parse an inbound WhatsApp body into a command + optional booking reference.
 * Supported: "/cancel", "cancel", "annuler", "/cancel RDV-8K2Q",
 * "cancel 8K2Q", "annuler RDV-8K2Q", plus confirm variants.
 */
function parseInbound(body: string): {
  command: "confirm" | "cancel" | null;
  ref: string | null;
} {
  const tokens = body.trim().split(/\s+/).filter(Boolean);
  const first = (tokens[0] ?? "").toLowerCase().replace(/^\//, "");
  const CANCEL = ["cancel", "cancelled", "annuler", "annule", "non"];
  const CONFIRM = ["confirm", "confirmed", "confirmer", "oui", "yes"];
  let command: "confirm" | "cancel" | null = null;
  if (CANCEL.includes(first)) command = "cancel";
  else if (CONFIRM.includes(first)) command = "confirm";

  let ref: string | null = null;
  for (let i = command ? 1 : 0; i < tokens.length; i++) {
    if (isBookingRef(tokens[i])) {
      ref = normalizeBookingRef(tokens[i]);
      break;
    }
  }
  return { command, ref };
}

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
    console.info("[message event]", input);
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
      VALUES (?, ?, ?, ?, 'whatsapp', 'meta_cloud', ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        id,
        input.businessId ?? null,
        input.bookingId ?? null,
        input.direction,
        input.providerMessageId ?? null,
        input.recipientPhone ?? null,
        input.body.slice(0, 2000),
        input.status,
        input.rawPayload ? JSON.stringify(input.rawPayload).slice(0, 4000) : null,
      ),
  );
}

// ─── Meta Cloud API send ──────────────────────────────────────────────────────
// https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages

async function sendWhatsApp(
  input: MessageInput,
): Promise<{ messageId: string | null; loggedOnly: boolean }> {
  const env = getCFEnv();
  const token = env?.META_WA_TOKEN;
  const phoneId = env?.META_WA_PHONE_ID;

  if (!token || !phoneId) {
    await logMessageEvent({
      businessId: input.businessId,
      bookingId: input.bookingId,
      direction: "outbound",
      recipientPhone: input.to,
      body: input.body,
      status: "logged_dev",
    });
    return { messageId: null, loggedOnly: true };
  }

  // Strip any "whatsapp:" prefix — Meta wants a plain E.164 number.
  const to = input.to.replace(/^whatsapp:/, "");

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: input.body },
      }),
    },
  );

  type MetaResponse = {
    messages?: Array<{ id: string }>;
    error?: { message: string; code: number };
  };
  const result = (await response.json().catch(() => null)) as MetaResponse | null;
  const messageId = result?.messages?.[0]?.id ?? null;

  await logMessageEvent({
    businessId: input.businessId,
    bookingId: input.bookingId,
    direction: "outbound",
    recipientPhone: input.to,
    body: input.body,
    status: response.ok
      ? "sent"
      : `failed: ${result?.error?.message ?? response.status}`,
    providerMessageId: messageId,
  });

  return { messageId, loggedOnly: false };
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
  return sendBookingConfirmation({ ...input, body: renderBookingConfirmation(input.booking) });
}

export async function sendTemplatedOwnerBookingAlert(
  input: Omit<MessageInput, "body"> & { booking: BookingMessageContext },
) {
  return sendOwnerBookingAlert({ ...input, body: renderOwnerBookingAlert(input.booking) });
}

export async function sendTemplatedCancellationMessage(
  input: Omit<MessageInput, "body"> & { booking: BookingMessageContext },
) {
  return sendCancellationMessage({ ...input, body: renderCancellationMessage(input.booking) });
}

// ─── Meta webhook signature validation ───────────────────────────────────────
// X-Hub-Signature-256: sha256=HMAC-SHA256(app_secret, raw_body)

export async function validateMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const env = getCFEnv();
  const appSecret = env?.META_APP_SECRET;
  if (!appSecret) return true; // dev mode: no secret configured, allow all

  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === expected;
}

export function metaVerifyToken(): string | undefined {
  return getCFEnv()?.META_WA_VERIFY_TOKEN;
}

// ─── Inbound WhatsApp reply handler ──────────────────────────────────────────

type InboundResult = {
  updated: boolean;
  reason?: string;
  bookingId?: string;
  status?: string;
  /** Reply text to send back to the sender; null = no reply. */
  reply: string | null;
  /** Phone number of the original sender — needed to dispatch the reply. */
  replyTo?: string | null;
};

type InboundBookingRow = {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_language: string;
  start_at: string;
  status: string;
  booking_ref: string | null;
  service_name: string | null;
  service_price_label: string | null;
  business_name: string | null;
  business_slug: string | null;
  business_whatsapp: string | null;
  booking_page_language: string | null;
};

const BOOKING_SELECT = `
  SELECT b.id, b.business_id, b.customer_name, b.customer_phone, b.customer_language,
         b.start_at, b.status, b.booking_ref,
         s.name as service_name, s.price_label as service_price_label,
         biz.name as business_name, biz.slug as business_slug,
         biz.whatsapp_number as business_whatsapp,
         biz.booking_page_language as booking_page_language
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN businesses biz ON biz.id = b.business_id
`;

function bookingContext(row: InboundBookingRow): BookingMessageContext {
  return {
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    businessName: row.business_name ?? "the business",
    serviceName: row.service_name ?? "your service",
    priceLabel: row.service_price_label,
    bookingRef: row.booking_ref,
    dateLabel: formatDateLabel(row.start_at, { year: "numeric" }),
    timeLabel: formatTimeLabel(row.start_at),
    language: (row.customer_language as BookingLanguage) ?? "Both",
  };
}

async function applyStatus(bookingId: string, status: "confirmed" | "cancelled") {
  const db = getD1()!;
  await d1Run(
    db
      .prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, bookingId),
  );
}

export async function handleInboundWhatsAppReply(input: {
  from: string;
  body: string;
  rawPayload?: unknown;
}): Promise<InboundResult> {
  const db = getD1();
  const { command: parsedCommand, ref } = parseInbound(input.body);
  const command =
    parsedCommand === "confirm" ? "confirmed" : parsedCommand === "cancel" ? "cancelled" : null;

  await logMessageEvent({
    direction: "inbound",
    recipientPhone: input.from,
    body: input.body,
    status: command ? `${command}${ref ? ` ${ref}` : ""}` : "unhandled",
    rawPayload: input.rawPayload,
  });

  if (!db || !command) return { updated: false, reason: "not_actionable", reply: null };

  const phone = input.from.replace(/^whatsapp:/, "");
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // ── Owner path: the sender is a business's WhatsApp number ───────────────
  const business = await d1First<{ id: string; booking_page_language: string | null }>(
    db
      .prepare("SELECT id, booking_page_language FROM businesses WHERE whatsapp_number = ?")
      .bind(phone),
  );

  if (business) {
    const ownerLang = (business.booking_page_language as BookingLanguage) ?? "Both";
    const wanted = command === "confirmed" ? "('pending')" : "('pending','confirmed')";
    const rows = ref
      ? await d1All<InboundBookingRow>(
          db
            .prepare(
              `${BOOKING_SELECT}
               WHERE b.business_id = ? AND b.booking_ref = ? AND b.status IN ${wanted}
               LIMIT 1`,
            )
            .bind(business.id, ref),
        )
      : await d1All<InboundBookingRow>(
          db
            .prepare(
              `${BOOKING_SELECT}
               WHERE b.business_id = ? AND b.status IN ${wanted} AND b.created_at >= ?
               ORDER BY b.created_at DESC LIMIT 1`,
            )
            .bind(business.id, since),
        );
    const booking = rows[0];
    if (!booking) {
      const reply = ref ? renderRefNotFound(ownerLang) : renderReplyAck("owner_none", ownerLang);
      return { updated: false, reason: "owner_no_booking", reply, replyTo: phone };
    }

    await applyStatus(booking.id, command);

    const context = bookingContext(booking);
    if (command === "cancelled") {
      await sendTemplatedCancellationMessage({
        businessId: booking.business_id,
        bookingId: booking.id,
        to: booking.customer_phone,
        booking: context,
      });
    } else {
      await sendWhatsApp({
        businessId: booking.business_id,
        bookingId: booking.id,
        to: booking.customer_phone,
        body: renderReplyAck("customer_confirmed_by_owner", context.language ?? "Both", context),
      });
    }

    const reply = renderReplyAck(
      command === "confirmed" ? "owner_confirmed" : "owner_cancelled",
      ownerLang,
      context,
    );
    return { updated: true, bookingId: booking.id, status: command, reply, replyTo: phone };
  }

  // ── Customer path ────────────────────────────────────────────────────────
  if (ref) {
    const rows = await d1All<InboundBookingRow>(
      db
        .prepare(
          `${BOOKING_SELECT}
           WHERE b.booking_ref = ? AND b.customer_phone = ? AND b.status != 'cancelled'
           LIMIT 1`,
        )
        .bind(ref, phone),
    );
    const booking = rows[0];
    if (!booking) {
      return { updated: false, reason: "ref_not_found", reply: renderRefNotFound("Both"), replyTo: phone };
    }
    return finishCustomerMutation(booking, command, phone);
  }

  const rows = await d1All<InboundBookingRow>(
    db
      .prepare(
        `${BOOKING_SELECT}
         WHERE b.customer_phone = ? AND b.status != 'cancelled' AND b.created_at >= ?
         ORDER BY b.start_at ASC LIMIT 10`,
      )
      .bind(phone, since),
  );

  if (rows.length === 0) {
    return { updated: false, reason: "not_found", reply: null };
  }

  if (rows.length > 1 && command === "cancelled") {
    const lang = (rows[0].customer_language as BookingLanguage) ?? "Both";
    const reply = renderChooseRefToCancel(
      lang,
      rows.map((r) => ({
        ref: r.booking_ref ?? "RDV-?",
        serviceName: r.service_name ?? "your service",
        dateLabel: formatDateLabel(r.start_at, { year: "numeric" }),
        timeLabel: formatTimeLabel(r.start_at),
      })),
    );
    return { updated: false, reason: "ambiguous", reply, replyTo: phone };
  }

  return finishCustomerMutation(rows[0], command, phone);
}

async function finishCustomerMutation(
  booking: InboundBookingRow,
  command: "confirmed" | "cancelled",
  senderPhone: string,
): Promise<InboundResult> {
  await applyStatus(booking.id, command);
  const context = bookingContext(booking);

  if (command === "cancelled" && booking.business_whatsapp) {
    await sendWhatsApp({
      businessId: booking.business_id,
      bookingId: booking.id,
      to: booking.business_whatsapp,
      body: renderReplyAck(
        "owner_customer_cancelled",
        (booking.booking_page_language as BookingLanguage) ?? "Both",
        context,
      ),
    });
  }

  const reply = renderReplyAck(
    command === "confirmed" ? "customer_confirmed" : "customer_cancelled",
    context.language ?? "Both",
    context,
  );
  return { updated: true, bookingId: booking.id, status: command, reply, replyTo: senderPhone };
}
