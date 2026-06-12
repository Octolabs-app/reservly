// src/lib/cf/messaging.ts
// WhatsApp messaging layer: Twilio REST API (plain fetch — Workers-safe, no
// Node SDK) with D1 event logging, inbound reply handling for both customers
// and owners, and Twilio webhook signature validation.

import { getCFEnv, getD1, d1All, d1First, d1Run } from "./db";
import {
  renderBookingConfirmation,
  renderCancellationMessage,
  renderOwnerBookingAlert,
  renderReplyAck,
  type BookingMessageContext,
} from "./message-templates";
import { formatDateLabel, formatTimeLabel } from "@/lib/rezavu/slots";
import type { BookingLanguage } from "@/lib/rezavu/types";

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
        input.body.slice(0, 2000),
        input.status,
        input.rawPayload ? JSON.stringify(input.rawPayload).slice(0, 4000) : null,
      ),
  );
}

// ─── Twilio send (REST API via fetch) ─────────────────────────────────────────

async function sendWhatsApp(
  input: MessageInput,
): Promise<{ sid: string | null; loggedOnly: boolean }> {
  const env = getCFEnv();
  const accountSid = env?.TWILIO_ACCOUNT_SID;
  const authToken = env?.TWILIO_AUTH_TOKEN;
  const from = env?.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
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

  const to = input.to.startsWith("whatsapp:") ? input.to : `whatsapp:${input.to}`;
  const body = new URLSearchParams({ From: from, To: to, Body: input.body });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const result = (await response.json().catch(() => null)) as {
    sid?: string;
    status?: string;
    message?: string;
  } | null;

  await logMessageEvent({
    businessId: input.businessId,
    bookingId: input.bookingId,
    direction: "outbound",
    recipientPhone: input.to,
    body: input.body,
    status: response.ok
      ? (result?.status ?? "queued")
      : `failed: ${result?.message ?? response.status}`,
    providerMessageId: result?.sid ?? null,
  });

  return { sid: result?.sid ?? null, loggedOnly: false };
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

// ─── Twilio webhook signature validation ─────────────────────────────────────
// https://www.twilio.com/docs/usage/security#validating-requests
// signature = base64(HMAC-SHA1(authToken, url + concat(sorted param k+v)))

export async function validateTwilioSignature(
  request: Request,
  params: Record<string, string>,
): Promise<boolean> {
  const env = getCFEnv();
  const authToken = env?.TWILIO_AUTH_TOKEN;
  // Without a token there is nothing to validate against (log-only/dev mode).
  if (!authToken) return true;

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  // Twilio signs the public URL it called. Behind Cloudflare the request.url
  // host is correct, but prefer SITE_URL origin when configured to survive
  // any internal rewrites.
  const requestUrl = new URL(request.url);
  const origin = env?.SITE_URL ? env.SITE_URL.replace(/\/$/, "") : requestUrl.origin;
  const url = `${origin}${requestUrl.pathname}${requestUrl.search}`;

  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

// ─── Inbound WhatsApp reply handler ──────────────────────────────────────────

type InboundResult = {
  updated: boolean;
  reason?: string;
  bookingId?: string;
  status?: string;
  /** Ack text to send back via TwiML; null = no reply. */
  reply: string | null;
};

type InboundBookingRow = {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_language: string;
  start_at: string;
  status: string;
  service_name: string | null;
  service_price_label: string | null;
  business_name: string | null;
  business_slug: string | null;
  business_whatsapp: string | null;
  booking_page_language: string | null;
};

const BOOKING_SELECT = `
  SELECT b.id, b.business_id, b.customer_name, b.customer_phone, b.customer_language,
         b.start_at, b.status,
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
    dateLabel: formatDateLabel(row.start_at, { year: "numeric" }),
    timeLabel: formatTimeLabel(row.start_at),
    language: (row.customer_language as BookingLanguage) ?? "Both",
  };
}

export async function handleInboundWhatsAppReply(input: {
  from: string;
  body: string;
  rawPayload?: unknown;
}): Promise<InboundResult> {
  const db = getD1();
  const normalized = input.body.trim().toUpperCase();
  const command = ["CONFIRM", "CONFIRMED", "YES", "OUI"].includes(normalized)
    ? "confirmed"
    : ["CANCEL", "CANCELLED", "ANNULER", "NON"].includes(normalized)
      ? "cancelled"
      : null;

  await logMessageEvent({
    direction: "inbound",
    recipientPhone: input.from,
    body: input.body,
    status: command ?? "unhandled",
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
    const rows = await d1All<InboundBookingRow>(
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
      return {
        updated: false,
        reason: "owner_no_booking",
        reply: renderReplyAck("owner_none", ownerLang),
      };
    }

    await d1Run(
      db
        .prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(command, booking.id),
    );

    // Tell the customer what the business decided.
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

    return {
      updated: true,
      bookingId: booking.id,
      status: command,
      reply: renderReplyAck(
        command === "confirmed" ? "owner_confirmed" : "owner_cancelled",
        ownerLang,
        context,
      ),
    };
  }

  // ── Customer path: act only when the phone has exactly one active booking ─
  const rows = await d1All<InboundBookingRow>(
    db
      .prepare(
        `${BOOKING_SELECT}
         WHERE b.customer_phone = ? AND b.status != 'cancelled' AND b.created_at >= ?
         ORDER BY b.created_at DESC LIMIT 2`,
      )
      .bind(phone, since),
  );

  if (rows.length !== 1) {
    return {
      updated: false,
      reason: rows.length > 1 ? "ambiguous" : "not_found",
      reply:
        rows.length > 1
          ? renderReplyAck(
              "customer_ambiguous",
              (rows[0].customer_language as BookingLanguage) ?? "Both",
            )
          : null,
    };
  }

  const booking = rows[0];
  await d1Run(
    db
      .prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(command, booking.id),
  );

  const context = bookingContext(booking);

  // Alert the owner when a customer cancels.
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

  return {
    updated: true,
    bookingId: booking.id,
    status: command,
    reply: renderReplyAck(
      command === "confirmed" ? "customer_confirmed" : "customer_cancelled",
      context.language ?? "Both",
      context,
    ),
  };
}
