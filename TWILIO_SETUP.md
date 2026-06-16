# Twilio WhatsApp Setup

## Required Variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

## Webhook

Configure the inbound WhatsApp webhook to:

```text
POST {SITE_URL}/api/twilio/inbound
```

## Reply Parsing

Randevou handles:

- `CONFIRM`, `CONFIRMED`, `YES`, `OUI` -> confirm booking
- `CANCEL`, `CANCELLED`, `NON` -> cancel booking

The handler matches by recent booking phone number. If more than one recent booking matches, it logs the reply and does not update a booking.

## Development Behavior

If Twilio env vars are missing, outbound messages are logged to the D1 `message_events` table (or the server console in local dev) instead of being sent.
